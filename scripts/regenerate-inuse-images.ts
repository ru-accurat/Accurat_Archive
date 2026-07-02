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
import { GoogleGenAI, Modality } from '@google/genai'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import type { Project } from '@/lib/types'
import { buildInUsePrompt } from '@/lib/inuse-prompt'
import {
  checkEligibility,
  inferInUseParams,
  candidateSourceImages,
  deviceFromAspectRatio,
  type InferredParams,
} from '@/lib/inuse-auto-params'
import { classifySourceImage } from '@/lib/inuse-classify'

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
  // Retry transient failures — a network blip that returns an empty list
  // would otherwise cause spurious "no source image" skips for the rest of
  // the batch. This bit us on the first run.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await sb.storage.from(SOURCE_BUCKET).list(folder, { limit: 200 })
      if (error) {
        console.warn(`  ! list("${folder}") error attempt ${attempt+1}: ${error.message}`)
        await sleep(2000 * (attempt + 1))
        continue
      }
      return (data || []).map(f => f.name)
    } catch (e) {
      console.warn(`  ! list("${folder}") threw attempt ${attempt+1}: ${e instanceof Error ? e.message : e}`)
      await sleep(2000 * (attempt + 1))
    }
  }
  throw new Error(`listProjectMedia("${folder}") failed after 3 attempts — aborting to avoid false skips`)
}

/** Retryable storage upload — 3 attempts with exponential backoff.
 *  Throws only after all attempts fail. */
async function uploadWithRetry(
  sb: SupabaseClient,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { error } = await sb.storage.from(bucket).upload(path, buffer, {
        upsert: true,
        contentType,
      })
      if (!error) return
      lastErr = error
      console.warn(`  ! upload ${bucket}/${path} attempt ${attempt+1}: ${error.message}`)
    } catch (e) {
      lastErr = e
      console.warn(`  ! upload ${bucket}/${path} threw attempt ${attempt+1}: ${e instanceof Error ? e.message : e}`)
    }
    await sleep(2000 * Math.pow(2, attempt))
  }
  throw lastErr instanceof Error ? lastErr : new Error(`upload failed: ${String(lastErr)}`)
}

/** Retryable storage download. */
async function downloadWithRetry(sb: SupabaseClient, bucket: string, path: string): Promise<Blob> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await sb.storage.from(bucket).download(path)
      if (!error && data) return data
      lastErr = error
    } catch (e) {
      lastErr = e
    }
    await sleep(1500 * (attempt + 1))
  }
  throw lastErr instanceof Error ? lastErr : new Error(`download failed: ${String(lastErr)}`)
}

/** List existing inuse files (used as a pre-upload snapshot). */
function existingInUseFrom(mediaFilenames: string[]): string[] {
  return mediaFilenames.filter(f => /_inuse[_.]/i.test(f))
}

/** Copy the given filenames from the live bucket into the archive bucket.
 *  Does NOT delete from the live bucket — that happens in finalizeArchive
 *  only after new variants are safely uploaded. */
async function stageArchiveOfInUse(sb: SupabaseClient, folder: string, runId: string, oldInuseFiles: string[]): Promise<string[]> {
  const archivedTo: string[] = []
  for (const f of oldInuseFiles) {
    try {
      const dl = await downloadWithRetry(sb, SOURCE_BUCKET, `${folder}/${f}`)
      const buffer = Buffer.from(await dl.arrayBuffer())
      await uploadWithRetry(sb, ARCHIVE_BUCKET, `${folder}/${runId}/${f}`, buffer, dl.type || 'image/webp')
      archivedTo.push(f)
    } catch (e) {
      console.warn(`  ! could not archive ${folder}/${f}: ${e instanceof Error ? e.message : e}`)
    }
  }
  return archivedTo
}

/** Delete already-archived old inuse files from the live bucket. Only called
 *  once the new variants are safely uploaded. */
async function finalizeArchive(sb: SupabaseClient, folder: string, archivedFiles: string[]) {
  if (archivedFiles.length === 0) return
  const paths = archivedFiles.map(f => `${folder}/${f}`)
  try {
    const { error } = await sb.storage.from(SOURCE_BUCKET).remove(paths)
    if (error) console.warn(`  ! could not remove archived-from-live ${paths.join(', ')}: ${error.message}`)
  } catch (e) {
    console.warn(`  ! remove threw: ${e instanceof Error ? e.message : e}`)
  }
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

async function generateOne(ai: GoogleGenAI, modelId: string, mime: string, base64: string, prompt: string): Promise<GenResultT> {
  try {
    const res = await ai.models.generateContent({
      model: modelId,
      contents: [{
        role: 'user',
        parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: prompt }],
      }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: { aspectRatio: '16:9' },
      },
    })
    for (const cand of res.candidates || []) {
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
  const filename = `${folder}_inuse_${seqLabel}.webp`
  const buffer = Buffer.from(base64, 'base64')
  await uploadWithRetry(sb, SOURCE_BUCKET, `${folder}/${filename}`, buffer, mime)
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
  ai: GoogleGenAI,
  modelId: string,
  apiKey: string,
  styleTemplate: string,
  project: Project,
): Promise<ProcessOutcome> {
  const folder = project.folderName
  const files = await listProjectMedia(sb, folder)
  const elig = checkEligibility(project, files)
  if (!elig.eligible) return { status: 'skipped', reason: elig.reason }

  // Walk candidate sources, classify each, pick the first `ui` or `mockup`.
  const candidates = candidateSourceImages(project, files)
  if (candidates.length === 0) return { status: 'skipped', reason: 'no eligible source image' }

  const params0 = inferInUseParams(project)

  let chosenSource: string | null = null
  let srcImg: Awaited<ReturnType<typeof fetchSourceImage>> = null
  let deviceOverride: string | null = null
  let classifyReason = ''

  for (const cand of candidates.slice(0, 4)) {
    const img = await fetchSourceImage(sb, folder, cand)
    if (!img) continue
    const cls = await classifySourceImage(apiKey, img.mime, img.base64)
    if (cls.kind === 'ui' || cls.kind === 'mockup') {
      chosenSource = cand
      srcImg = img
      deviceOverride = deviceFromAspectRatio(cls.width, cls.height, params0.device)
      classifyReason = `${cls.kind} (${cls.width}x${cls.height}, ratio ${cls.aspectRatio.toFixed(2)})`
      break
    } else {
      console.log(`  ~ skipped source ${cand}: classified as ${cls.kind}`)
    }
  }

  if (!chosenSource || !srcImg) {
    return { status: 'skipped', reason: 'no candidate source classified as UI or mockup' }
  }

  // Load per-project override, else use auto-inferred params (with device possibly overridden by source aspect).
  const { data: ov } = await sb.from('inuse_overrides').select('*').eq('project_id', project.id).maybeSingle()
  const params: InferredParams = ov
    ? {
        ...params0,
        device: (ov.device as string) || deviceOverride || params0.device,
        surface: (ov.surface as string) ?? params0.surface,
        includeHuman: ov.include_human ?? true,
        environment: (ov.environment as string) || params0.environment,
        reason: `override: ${ov.notes || 'manual'}`,
      }
    : { ...params0, device: deviceOverride || params0.device }

  console.log(`  device=${params.device} env-category=${params.reason.match(/environment:\s*([a-z_]+)/)?.[1] || '?'} framing=${params.framingRecipe.key} source=${chosenSource} (${classifyReason})`)

  if (DRY_RUN) return { status: 'done', reason: 'dry-run', params, source: chosenSource }

  // Build prompt with the full new pool (cast + framing recipe + photo style)
  const prompt = buildInUsePrompt({
    styleTemplate,
    device: params.device,
    surface: params.surface,
    includeHuman: params.includeHuman,
    framing: params.framing,
    environment: params.environment,
    cast: params.cast,
    framingRecipe: params.framingRecipe,
    photoStyle: params.photoStyle,
  })

  // Step 1: generate. Nothing has been mutated yet. If this fails we skip
  // cleanly without touching storage.
  const t0 = Date.now()
  const r1 = await generateOne(ai, modelId, srcImg.mime, srcImg.base64, prompt)
  await sleep(REQUEST_DELAY_MS)
  const r2 = await generateOne(ai, modelId, srcImg.mime, srcImg.base64, prompt)
  console.log(`  gen 2 variants in ${((Date.now()-t0)/1000).toFixed(1)}s — r1=${r1.success} r2=${r2.success}`)

  const successes = [r1, r2].filter((r): r is Extract<GenResultT, { success: true }> => r.success)
  if (successes.length === 0) {
    return { status: 'failed', reason: `both variants failed: ${(r1 as { error: string }).error} | ${(r2 as { error: string }).error}` }
  }

  // Step 2: upload new variants first (before touching old inuse files).
  // If upload fails, old files stay live — project keeps its previous inuse image.
  const kept: string[] = []
  try {
    for (let i = 0; i < successes.length; i++) {
      const label = i === 0 ? String(Date.now()) : `${Date.now()}_alt`
      const fn = await uploadVariant(sb, folder, label, successes[i].base64, successes[i].mime)
      kept.push(fn)
    }
  } catch (e) {
    return { status: 'failed', reason: `upload new variant failed: ${e instanceof Error ? e.message : e}` }
  }

  // Step 3: copy the pre-upload inuse files (snapshot taken at the top of
  // processProject, before any new files were uploaded) to the archive
  // bucket. Passing this snapshot is critical — otherwise we'd also archive
  // the new variants we just uploaded and then delete them in finalizeArchive.
  const oldInuseFiles = existingInUseFrom(files)
  const archivedFiles = await stageArchiveOfInUse(sb, folder, RUN_ID, oldInuseFiles)
  if (archivedFiles.length) console.log(`  archived ${archivedFiles.length} old inuse file(s) → ${ARCHIVE_BUCKET}/${folder}/${RUN_ID}/`)

  // Step 4: repoint DB references from the old (soon-deleted) inuse filenames
  // to the first new variant.
  await repointDbReferences(sb, project.id, archivedFiles, kept[0])

  // Step 5: only NOW delete the old inuse files from the live bucket, since
  // both new variants are live and DB refs are updated.
  await finalizeArchive(sb, folder, archivedFiles)

  // Log to activity_log
  await sb.from('activity_log').insert({
    action: 'inuse_batch_regenerated',
    project_id: project.id,
    details: {
      run_id: RUN_ID,
      model: 'gemini-3-pro-image',
      params,
      source: chosenSource,
      classify: classifyReason,
      kept,
      archived_files: archivedFiles,
      archive_path: `${ARCHIVE_BUCKET}/${folder}/${RUN_ID}/`,
    },
  })

  return { status: 'done', kept, archivedFolder: `${folder}/${RUN_ID}`, params, source: chosenSource }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE env vars missing')

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { apiKey, model: modelId } = await loadConfig(sb)
  const styleTemplate = await loadStyleTemplate(sb)
  const ai = new GoogleGenAI({ apiKey })

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
      outcome = await processProject(sb, ai, modelId, apiKey, styleTemplate, p)
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
