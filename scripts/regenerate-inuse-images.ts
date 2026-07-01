/**
 * Batch regeneration of in-use images with Gemini 3 Pro Image.
 *
 * Run locally:
 *   node --env-file=.env.local --import tsx scripts/regenerate-inuse-images.ts [--dry-run] [--limit=N] [--run-id=NAME] [--only=projectId,projectId]
 *
 * Design:
 * - Uses service-role Supabase client + direct Gemini SDK. Bypasses the HTTP
 *   API route entirely (no requireEditor auth dance).
 * - Idempotent-resume via `inuse_batch_runs(run_id, project_id, status)`. Same
 *   run_id: skip rows already marked 'done' or 'skipped'.
 * - Backs up existing _inuse_* files to a separate bucket
 *   `project-media-archive` before overwriting. Rollback = copy back.
 * - Auto-promotes the first successful variant. Second variant (if produced)
 *   also promoted to a `_alt` sibling. No manual review gate.
 */

// Env is loaded via `node --env-file=.env.local` at run time.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import type { Project } from '@/lib/types'
import { buildInUsePrompt } from '@/lib/inuse-prompt'
import {
  checkEligibility,
  inferInUseParams,
  pickSourceImage,
  type InferredParams,
} from '@/lib/inuse-auto-params'

const ARGV = process.argv.slice(2)
const DRY_RUN = ARGV.includes('--dry-run')
const RUN_ID = arg('--run-id') || `run-${new Date().toISOString().replace(/[:.]/g, '-')}`
const LIMIT = intArg('--limit')
const ONLY = arg('--only')?.split(',').filter(Boolean)
const ARCHIVE_BUCKET = 'project-media-archive'
const SOURCE_BUCKET = 'project-media'
const REQUEST_DELAY_MS = 1000

function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : undefined
}
function intArg(name: string): number | undefined {
  const v = arg(name)
  return v ? parseInt(v, 10) : undefined
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function ensureArchiveBucket(sb: SupabaseClient) {
  const { data: buckets } = await sb.storage.listBuckets()
  if (buckets?.some(b => b.name === ARCHIVE_BUCKET)) return
  console.log(`Creating archive bucket "${ARCHIVE_BUCKET}"...`)
  const { error } = await sb.storage.createBucket(ARCHIVE_BUCKET, { public: false })
  if (error && !/already exists/i.test(error.message)) throw error
}

async function loadStyleTemplate(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.from('ai_settings').select('value').eq('key', 'inuse_prompt').single()
  return (data?.value as string) || ''
}

async function loadConfig(sb: SupabaseClient) {
  const { data } = await sb.from('config').select('key, value').in('key', ['googleApiKey', 'inuseImageModel'])
  const map = new Map<string, string>((data || []).map(r => [r.key as string, r.value as string]))
  const apiKey = map.get('googleApiKey')
  const model = map.get('inuseImageModel') || 'gemini-3-pro-image'
  if (!apiKey) throw new Error('config.googleApiKey missing')
  return { apiKey, model }
}

async function listProjectMedia(sb: SupabaseClient, folder: string): Promise<string[]> {
  const { data, error } = await sb.storage.from(SOURCE_BUCKET).list(folder, { limit: 200 })
  if (error) return []
  return (data || []).map(f => f.name)
}

async function backupExistingInUse(sb: SupabaseClient, folder: string, runId: string): Promise<string[]> {
  const files = await listProjectMedia(sb, folder)
  const inuse = files.filter(f => /_inuse[_.]/i.test(f))
  const archivedTo: string[] = []
  for (const f of inuse) {
    const src = `${folder}/${f}`
    const dst = `${folder}/${runId}/${f}`
    // Download
    const { data: dl, error: dlErr } = await sb.storage.from(SOURCE_BUCKET).download(src)
    if (dlErr || !dl) { console.warn(`  ! could not download ${src}: ${dlErr?.message}`); continue }
    const buffer = Buffer.from(await dl.arrayBuffer())
    // Upload to archive
    const { error: upErr } = await sb.storage.from(ARCHIVE_BUCKET).upload(dst, buffer, { upsert: true, contentType: dl.type || 'image/webp' })
    if (upErr) { console.warn(`  ! could not upload ${dst}: ${upErr.message}`); continue }
    // Delete from source
    const { error: rmErr } = await sb.storage.from(SOURCE_BUCKET).remove([src])
    if (rmErr) { console.warn(`  ! could not remove ${src}: ${rmErr.message}`); continue }
    archivedTo.push(f)
  }
  return archivedTo
}

async function fetchSourceImage(sb: SupabaseClient, folder: string, filename: string): Promise<{ mime: string; base64: string } | null> {
  const { data, error } = await sb.storage.from(SOURCE_BUCKET).download(`${folder}/${filename}`)
  if (error || !data) return null
  const buffer = Buffer.from(await data.arrayBuffer())
  const ext = filename.toLowerCase().split('.').pop() || ''
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
  return { mime, base64: buffer.toString('base64') }
}

type GenResultT = { success: true; base64: string; mime: string } | { success: false; error: string }

async function generateOne(model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, mime: string, base64: string, prompt: string): Promise<GenResultT> {
  try {
    const res = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: prompt }],
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] as unknown as undefined } as Record<string, unknown>,
    })
    for (const cand of res.response.candidates || []) {
      for (const part of cand.content?.parts || []) {
        if (part.inlineData?.data) {
          return { success: true, base64: part.inlineData.data, mime: part.inlineData.mimeType || 'image/webp' }
        }
      }
    }
    return { success: false, error: 'no image in response' }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function uploadVariant(sb: SupabaseClient, folder: string, seqLabel: string, base64: string, mime: string): Promise<string> {
  // Force .webp filename regardless of source mime — matches naming convention.
  const filename = `${folder}_inuse_${seqLabel}.webp`
  const path = `${folder}/${filename}`
  const buffer = Buffer.from(base64, 'base64')
  const { error } = await sb.storage.from(SOURCE_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: mime,
  })
  if (error) throw error
  return filename
}

async function repointDbReferences(sb: SupabaseClient, projectId: string, archivedFiles: string[], newFilename: string) {
  if (archivedFiles.length === 0) return
  const { data } = await sb.from('projects').select('thumb_image, hero_image, media_order').eq('id', projectId).single()
  if (!data) return
  const updates: Record<string, unknown> = {}
  if (data.thumb_image && archivedFiles.includes(data.thumb_image as string)) updates.thumb_image = newFilename
  if (data.hero_image && archivedFiles.includes(data.hero_image as string)) updates.hero_image = newFilename
  const order = (data.media_order as string[] | null) || []
  const patched = order.map(f => archivedFiles.includes(f) ? newFilename : f)
  if (JSON.stringify(patched) !== JSON.stringify(order)) updates.media_order = patched
  if (Object.keys(updates).length > 0) {
    await sb.from('projects').update(updates).eq('id', projectId)
  }
}

interface ProcessOutcome {
  status: 'done' | 'skipped' | 'failed'
  reason?: string
  kept?: string[]
  archivedFolder?: string
  params?: InferredParams
  source?: string
}

async function processProject(
  sb: SupabaseClient,
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  styleTemplate: string,
  project: Project,
): Promise<ProcessOutcome> {
  const folder = project.folderName
  const files = await listProjectMedia(sb, folder)
  const elig = checkEligibility(project, files)
  if (!elig.eligible) return { status: 'skipped', reason: elig.reason }

  const source = pickSourceImage(project, files)
  if (!source) return { status: 'skipped', reason: 'no eligible source image' }

  // Load per-project override, else auto-infer.
  const { data: ov } = await sb.from('inuse_overrides').select('*').eq('project_id', project.id).maybeSingle()
  const params: InferredParams = ov
    ? {
        device: (ov.device as string) || inferInUseParams(project).device,
        surface: ov.surface as string | undefined,
        includeHuman: ov.include_human ?? true,
        framing: (ov.framing as InferredParams['framing']) || 'hands_only',
        environment: (ov.environment as string) || inferInUseParams(project).environment,
        reason: `override: ${ov.notes || 'manual'}`,
      }
    : inferInUseParams(project)

  console.log(`  device=${params.device} env="${params.environment.slice(0, 60)}..." source=${source}`)
  console.log(`  reason: ${params.reason}`)

  if (DRY_RUN) return { status: 'done', reason: 'dry-run', params, source }

  // Backup existing inuse files
  const archivedFiles = await backupExistingInUse(sb, folder, RUN_ID)
  if (archivedFiles.length) console.log(`  backed up ${archivedFiles.length} existing inuse file(s) → ${ARCHIVE_BUCKET}/${folder}/${RUN_ID}/`)

  // Fetch source
  const srcImg = await fetchSourceImage(sb, folder, source)
  if (!srcImg) return { status: 'failed', reason: `could not fetch source ${source}` }

  // Build prompt
  const prompt = buildInUsePrompt({
    styleTemplate,
    device: params.device,
    surface: params.surface,
    includeHuman: params.includeHuman,
    framing: params.framing,
    environment: params.environment,
  })

  // Generate two variants sequentially (respect rate limits).
  const t0 = Date.now()
  const r1 = await generateOne(model, srcImg.mime, srcImg.base64, prompt)
  await sleep(REQUEST_DELAY_MS)
  const r2 = await generateOne(model, srcImg.mime, srcImg.base64, prompt)
  console.log(`  gen 2 variants in ${((Date.now()-t0)/1000).toFixed(1)}s — r1=${r1.success} r2=${r2.success}`)

  const successes = [r1, r2].filter((r): r is Extract<GenResultT, { success: true }> => r.success)
  if (successes.length === 0) {
    return { status: 'failed', reason: `both variants failed: ${(r1 as { error: string }).error} | ${(r2 as { error: string }).error}` }
  }

  const kept: string[] = []
  for (let i = 0; i < successes.length; i++) {
    const label = i === 0 ? String(Date.now()) : `${Date.now()}_alt`
    const fn = await uploadVariant(sb, folder, label, successes[i].base64, successes[i].mime)
    kept.push(fn)
  }

  // Repoint DB references from archived files to the first new variant.
  await repointDbReferences(sb, project.id, archivedFiles, kept[0])

  // Log to activity_log
  await sb.from('activity_log').insert({
    action: 'inuse_batch_regenerated',
    project_id: project.id,
    details: {
      run_id: RUN_ID,
      model: 'gemini-3-pro-image',
      params,
      source,
      kept,
      archived_files: archivedFiles,
      archive_path: `${ARCHIVE_BUCKET}/${folder}/${RUN_ID}/`,
    },
  })

  return { status: 'done', kept, archivedFolder: `${folder}/${RUN_ID}`, params, source }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE env vars missing')

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { apiKey, model: modelId } = await loadConfig(sb)
  const styleTemplate = await loadStyleTemplate(sb)
  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: modelId })

  console.log(`RUN ${RUN_ID}${DRY_RUN ? ' (DRY-RUN)' : ''}`)
  console.log(`model: ${modelId}`)
  console.log(`style template length: ${styleTemplate.length}`)

  if (!DRY_RUN) await ensureArchiveBucket(sb)

  const { data: projRows } = await sb.from('projects').select('*').order('id')
  const projects = ((projRows || []) as ProjectRow[]).map(rowToProject)
  const targets = ONLY ? projects.filter(p => ONLY.includes(p.id)) : projects
  const bounded = LIMIT ? targets.slice(0, LIMIT) : targets
  console.log(`considering ${bounded.length} project(s)${LIMIT ? ` (limit=${LIMIT})` : ''}`)

  // Skip already-done for this run.
  const { data: doneRows } = await sb.from('inuse_batch_runs').select('project_id').eq('run_id', RUN_ID).in('status', ['done', 'skipped'])
  const doneSet = new Set((doneRows || []).map(r => r.project_id as string))
  const pending = bounded.filter(p => !doneSet.has(p.id))
  console.log(`resuming: ${bounded.length - pending.length} already done, ${pending.length} to process\n`)

  let done = 0, skipped = 0, failed = 0
  for (const p of pending) {
    console.log(`[${done + skipped + failed + 1}/${pending.length}] ${p.id}  (${p.client} — ${p.projectName})`)

    if (!DRY_RUN) {
      await sb.from('inuse_batch_runs').upsert({ run_id: RUN_ID, project_id: p.id, status: 'pending', started_at: new Date().toISOString() })
    }

    let outcome: ProcessOutcome
    try {
      outcome = await processProject(sb, model, styleTemplate, p)
    } catch (e) {
      outcome = { status: 'failed', reason: e instanceof Error ? e.message : String(e) }
    }

    if (outcome.status === 'done') { done++; console.log(`  ✓ ${(outcome.kept || []).length} variant(s) kept`) }
    else if (outcome.status === 'skipped') { skipped++; console.log(`  skipped: ${outcome.reason}`) }
    else { failed++; console.log(`  ✗ failed: ${outcome.reason}`) }

    if (!DRY_RUN) {
      await sb.from('inuse_batch_runs').upsert({
        run_id: RUN_ID,
        project_id: p.id,
        status: outcome.status,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        error: outcome.status === 'failed' ? outcome.reason : null,
        kept_files: outcome.kept || null,
        archived_to: outcome.archivedFolder || null,
      })
    }

    await sleep(REQUEST_DELAY_MS)
  }

  console.log(`\nRUN ${RUN_ID} complete: ${done} done, ${skipped} skipped, ${failed} failed`)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
