import { NextResponse } from 'next/server'
import PptxGenJS from 'pptxgenjs'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject, type ProjectRow } from '@/lib/db-utils'
import { DECK, POS, type DeckLayout } from '@/lib/pptx-templates'
import type { Project } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''

interface ExportBody {
  coverTitle?: string
  coverSubtitle?: string
  layout?: DeckLayout
  projectMedia?: Record<string, string[]>
}

/** Map storage path to public URL */
function mediaUrl(folderName: string, filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`
}

/** Small concurrency-limited map helper */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i])
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

type ImageMap = Map<string, string> // "folder/file" -> dataURL

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(ab).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

function safeText(s: string | null | undefined, max = 500): string {
  if (!s) return ''
  const trimmed = s.replace(/\s+/g, ' ').trim()
  return trimmed.length > max ? trimmed.slice(0, max - 1) + '…' : trimmed
}

function addCoverSlide(pptx: PptxGenJS, title: string, subtitle: string, collectionName: string) {
  const slide = pptx.addSlide()
  slide.background = { color: DECK.colors.bgDark }
  slide.addShape('rect', {
    x: 0.6,
    y: 2.8,
    w: 1.2,
    h: 0.08,
    fill: { color: DECK.colors.accent },
    line: { color: DECK.colors.accent, width: 0 },
  })
  slide.addText(title || collectionName, {
    ...POS.coverTitle,
    fontFace: DECK.fonts.title,
    fontSize: DECK.sizes.coverTitle,
    color: 'FFFFFF',
    bold: true,
    valign: 'top',
  })
  if (subtitle) {
    slide.addText(subtitle, {
      ...POS.coverSubtitle,
      fontFace: DECK.fonts.body,
      fontSize: DECK.sizes.coverSubtitle,
      color: 'CCCCCC',
      valign: 'top',
    })
  }
  slide.addText('accurat.it', {
    ...POS.coverFooter,
    fontFace: DECK.fonts.body,
    fontSize: 10,
    color: '888888',
    align: 'left',
  })
}

function addSectionDivider(pptx: PptxGenJS, name: string, subtitle: string) {
  const slide = pptx.addSlide()
  slide.background = { color: DECK.colors.bg }
  slide.addShape('rect', {
    x: 0.6, y: 2.8, w: 1.2, h: 0.08,
    fill: { color: DECK.colors.accent }, line: { color: DECK.colors.accent, width: 0 },
  })
  slide.addText(name, {
    ...POS.sectionTitle,
    fontFace: DECK.fonts.title,
    fontSize: DECK.sizes.sectionTitle,
    color: DECK.colors.text,
    bold: true,
    valign: 'top',
  })
  if (subtitle) {
    slide.addText(subtitle, {
      ...POS.sectionSubtitle,
      fontFace: DECK.fonts.body,
      fontSize: 16,
      color: DECK.colors.textMuted,
      valign: 'top',
    })
  }
}

function addProjectStandardSlide(
  pptx: PptxGenJS,
  project: Project,
  images: string[], // dataURLs
) {
  const slide = pptx.addSlide()
  slide.background = { color: DECK.colors.bg }

  if (images.length === 0) {
    // Text-only slide
    slide.addText(project.projectName || project.fullName, {
      ...POS.projectTitle,
      fontFace: DECK.fonts.title, fontSize: DECK.sizes.projectTitle, color: DECK.colors.text, bold: true,
    })
    slide.addText(project.client || '', {
      ...POS.projectClient,
      fontFace: DECK.fonts.body, fontSize: DECK.sizes.projectSubtitle, color: DECK.colors.accent,
    })
    slide.addText(safeText(project.tagline || project.description, 800), {
      x: 0.6, y: 1.8, w: 12.1, h: 5.2,
      fontFace: DECK.fonts.body, fontSize: DECK.sizes.body + 2, color: DECK.colors.textMuted, valign: 'top',
    })
    return
  }

  if (images.length === 1) {
    // Full-bleed hero with overlaid title
    slide.addImage({ data: images[0], ...POS.projectHeroFull, sizing: { type: 'cover', w: POS.projectHeroFull.w, h: POS.projectHeroFull.h } })
    // Dark gradient overlay (approximated with a semi-transparent rect)
    slide.addShape('rect', {
      x: 0, y: 5.5, w: 13.3, h: 2.0,
      fill: { color: '000000', transparency: 40 },
      line: { color: '000000', width: 0 },
    })
    slide.addText(project.projectName || project.fullName, {
      ...POS.projectTitleOverlay,
      fontFace: DECK.fonts.title, fontSize: DECK.sizes.projectTitle, color: 'FFFFFF', bold: true,
    })
    slide.addText(project.client || '', {
      ...POS.projectSubtitleOverlay,
      fontFace: DECK.fonts.body, fontSize: DECK.sizes.projectSubtitle, color: 'DDDDDD',
    })
    return
  }

  // 2+ images: left text, right grid
  slide.addText(project.projectName || project.fullName, {
    ...POS.projectTitle,
    fontFace: DECK.fonts.title, fontSize: DECK.sizes.projectTitle, color: DECK.colors.text, bold: true,
  })
  slide.addText(project.client || '', {
    ...POS.projectClient,
    fontFace: DECK.fonts.body, fontSize: DECK.sizes.projectSubtitle, color: DECK.colors.accent,
  })
  slide.addText(safeText(project.tagline || project.description, 600), {
    ...POS.projectBody,
    fontFace: DECK.fonts.body, fontSize: DECK.sizes.body, color: DECK.colors.textMuted, valign: 'top',
  })

  const slots = [POS.gridTR, POS.gridBL, POS.gridBR].slice(0, Math.min(3, images.length - 1))
  // First image as bigger hero on right-top area
  slide.addImage({ data: images[0], x: 6.9, y: 1.8, w: 5.8, h: 2.5, sizing: { type: 'cover', w: 5.8, h: 2.5 } })
  for (let i = 0; i < slots.length; i++) {
    const img = images[i + 1]
    if (!img) break
    const s = slots[i]
    slide.addImage({ data: img, ...s, sizing: { type: 'cover', w: s.w, h: s.h } })
  }
}

function addProjectDetailedSlides(
  pptx: PptxGenJS,
  project: Project,
  images: string[],
) {
  // Intro text slide
  const intro = pptx.addSlide()
  intro.background = { color: DECK.colors.bg }
  intro.addText(project.projectName || project.fullName, {
    ...POS.projectTitle,
    fontFace: DECK.fonts.title, fontSize: DECK.sizes.projectTitle, color: DECK.colors.text, bold: true,
  })
  intro.addText(project.client || '', {
    ...POS.projectClient,
    fontFace: DECK.fonts.body, fontSize: DECK.sizes.projectSubtitle, color: DECK.colors.accent,
  })
  const introBody: string[] = []
  if (project.tagline) introBody.push(safeText(project.tagline, 300))
  if (project.challenge) introBody.push('Challenge: ' + safeText(project.challenge, 400))
  if (project.solution) introBody.push('Solution: ' + safeText(project.solution, 400))
  intro.addText(introBody.join('\n\n') || safeText(project.description, 800), {
    x: 0.6, y: 1.8, w: 12.1, h: 5.4,
    fontFace: DECK.fonts.body, fontSize: DECK.sizes.body + 1, color: DECK.colors.textMuted, valign: 'top',
    paraSpaceAfter: 8,
  })

  // One slide per image
  for (const img of images) {
    const slide = pptx.addSlide()
    slide.background = { color: DECK.colors.bgDark }
    slide.addImage({ data: img, ...POS.projectHeroFull, sizing: { type: 'contain', w: POS.projectHeroFull.w, h: POS.projectHeroFull.h } })
  }
}

function addThankYouSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide()
  slide.background = { color: DECK.colors.bgDark }
  slide.addShape('rect', {
    x: 0.6, y: 2.8, w: 1.2, h: 0.08,
    fill: { color: DECK.colors.accent }, line: { color: DECK.colors.accent, width: 0 },
  })
  slide.addText('Thank you', {
    ...POS.thankYouTitle,
    fontFace: DECK.fonts.title, fontSize: DECK.sizes.coverTitle, color: 'FFFFFF', bold: true,
  })
  slide.addText('accurat.it', {
    ...POS.thankYouContact,
    fontFace: DECK.fonts.body, fontSize: 18, color: DECK.colors.accent,
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: ExportBody = {}
  try {
    body = await req.json()
  } catch {
    // allow empty body
  }

  const layout: DeckLayout = body.layout === 'detailed' ? 'detailed' : 'standard'
  const projectMedia = body.projectMedia || {}

  const supabase = createServiceClient()

  const { data: collection, error: colErr } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single()
  if (colErr || !collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const { data: groups } = await supabase
    .from('collection_groups')
    .select('*')
    .eq('collection_id', id)
    .order('sort_order')

  const { data: items } = await supabase
    .from('collection_items')
    .select('project_id, position, group_id')
    .eq('collection_id', id)
    .order('position')

  const projectIds = (items || []).map(i => i.project_id)

  let projects: Project[] = []
  if (projectIds.length > 0) {
    const { data: rows } = await supabase.from('projects').select('*').in('id', projectIds)
    if (rows) {
      const map = new Map(rows.map(r => [r.id, rowToProject(r as ProjectRow)]))
      projects = projectIds.map(pid => map.get(pid)!).filter(Boolean)
    }
  }

  // Figure out which images to fetch per project
  const imageTasks: { key: string; url: string }[] = []
  const perProjectKeys: Record<string, string[]> = {}
  for (const p of projects) {
    const selected = projectMedia[p.id]
    let files: string[]
    if (selected && selected.length > 0) {
      files = selected
    } else {
      // Default: hero + first 2 gallery images
      const all = p.mediaOrder || []
      const defaults: string[] = []
      if (p.heroImage) defaults.push(p.heroImage)
      for (const f of all) {
        if (f === p.heroImage) continue
        defaults.push(f)
        if (defaults.length >= 3) break
      }
      files = defaults
    }
    perProjectKeys[p.id] = files.map(f => `${p.folderName}::${f}`)
    for (const f of files) {
      imageTasks.push({ key: `${p.folderName}::${f}`, url: mediaUrl(p.folderName, f) })
    }
  }

  // De-dup and fetch with concurrency 5
  const uniqueTasks = Array.from(new Map(imageTasks.map(t => [t.key, t])).values())
  const imageResults = await mapLimit(uniqueTasks, 5, async t => ({ key: t.key, data: await fetchImageAsDataUrl(t.url) }))
  const imageMap: ImageMap = new Map()
  for (const r of imageResults) {
    if (r.data) imageMap.set(r.key, r.data)
  }

  // Build deck
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = collection.name || 'Pitch Deck'
  pptx.company = 'Accurat'

  addCoverSlide(pptx, body.coverTitle || collection.name, body.coverSubtitle || collection.subtitle || '', collection.name)

  // Group items by group_id; fall back to ungrouped order
  const itemsByGroup = new Map<string | null, string[]>()
  for (const it of items || []) {
    const k = it.group_id
    if (!itemsByGroup.has(k)) itemsByGroup.set(k, [])
    itemsByGroup.get(k)!.push(it.project_id)
  }
  const projectById = new Map(projects.map(p => [p.id, p]))

  const hasGroups = (groups || []).length > 0

  function renderProject(p: Project) {
    const imgs = (perProjectKeys[p.id] || []).map(k => imageMap.get(k)).filter((x): x is string => !!x)
    if (layout === 'detailed') addProjectDetailedSlides(pptx, p, imgs)
    else addProjectStandardSlide(pptx, p, imgs)
  }

  if (hasGroups) {
    for (const g of groups!) {
      const pids = itemsByGroup.get(g.id) || []
      if (pids.length === 0) continue
      addSectionDivider(pptx, g.name, g.subtitle || '')
      for (const pid of pids) {
        const p = projectById.get(pid)
        if (p) renderProject(p)
      }
    }
    // Ungrouped
    const ungrouped = itemsByGroup.get(null) || []
    if (ungrouped.length > 0) {
      for (const pid of ungrouped) {
        const p = projectById.get(pid)
        if (p) renderProject(p)
      }
    }
  } else {
    for (const p of projects) renderProject(p)
  }

  addThankYouSlide(pptx)

  // Write to buffer
  const nodeBuf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer

  const safeName = (collection.name || 'pitch-deck').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
  return new NextResponse(new Uint8Array(nodeBuf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${safeName}.pptx"`,
      'Cache-Control': 'no-store',
    },
  })
}
