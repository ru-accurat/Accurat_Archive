import type { createServiceClient } from '@/lib/supabase'

export interface TrimmedProject {
  id: string
  client: string
  projectName: string
  tagline?: string
  description?: string
  domains?: string[]
  services?: string[]
  output?: string
  section?: string
}

const FALLBACK_STYLE = `# Accurat Voice
- Direct, confident, precise. First person plural ("we").
- Ground in specifics, name the technology, quantify the outcome.
- Avoid empty superlatives ("cutting-edge", "innovative", "leverage", "transformative").
- Prefer "data-native" over "data-driven", "Data Portrait" (capitalized).
- Show the thinking, not just the making.`

export async function loadStyleGuide(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string> {
  const { data } = await supabase.from('ai_settings').select('key, value')
  if (!data || data.length === 0) return FALLBACK_STYLE
  const settings: Record<string, string> = {}
  for (const row of data) {
    if (row.value) settings[row.key] = row.value
  }
  const parts: string[] = []
  if (settings.guidelines) parts.push(settings.guidelines)
  else parts.push(FALLBACK_STYLE)
  if (settings.voice) parts.push('\n\n# Voice & Tone\n' + settings.voice)
  if (settings.company) parts.push('\n\n# Company Background\n' + settings.company)
  if (settings.market) parts.push('\n\n# Market Positioning\n' + settings.market)
  return parts.join('\n')
}

/** Strip code fences and parse the first JSON object/array out of a Claude response. */
export function extractJson<T = unknown>(text: string): T {
  let cleaned = text.trim()
  // Remove markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) cleaned = fenceMatch[1].trim()
  // Find first { or [
  const firstObj = cleaned.indexOf('{')
  const firstArr = cleaned.indexOf('[')
  let start = -1
  if (firstObj === -1) start = firstArr
  else if (firstArr === -1) start = firstObj
  else start = Math.min(firstObj, firstArr)
  if (start > 0) cleaned = cleaned.slice(start)
  // Find matching last brace
  const lastObj = cleaned.lastIndexOf('}')
  const lastArr = cleaned.lastIndexOf(']')
  const end = Math.max(lastObj, lastArr)
  if (end > 0) cleaned = cleaned.slice(0, end + 1)
  return JSON.parse(cleaned) as T
}

export function buildSuggestPrompt(
  brief: string,
  projects: TrimmedProject[],
  styleGuide: string
): { system: string; user: string } {
  const system = `You are a senior strategist at Accurat, a data-native design studio. You help match the studio's past work to incoming client briefs (RFPs).

${styleGuide}

You receive a brief and the COMPLETE list of Accurat projects. Your job: pick 5–8 projects that are the most strategically relevant to the brief — favouring depth of relevance (shared problem, audience, methodology, deliverable type, domain) over surface keyword overlap. Briefly justify each pick.

Always return STRICT JSON, no preamble, no markdown fences. Schema:
{ "suggestions": [ { "projectId": "<exact id from input>", "relevance": "<2–4 sentence paragraph in Accurat voice explaining why this project is relevant to THIS brief>" } ] }`

  const user = `# Brief
${brief.trim()}

# Available projects (${projects.length} total)
${JSON.stringify(projects)}

Return JSON with 5–8 suggestions. Each projectId MUST match an id from the list above. Each relevance paragraph should speak directly to the brief (do not just summarize the project).`

  return { system, user }
}

export function buildRelevancePrompt(
  brief: string,
  project: TrimmedProject,
  styleGuide: string
): { system: string; user: string } {
  const system = `You are a senior strategist at Accurat. Write one short paragraph (2–4 sentences) in Accurat voice explaining why a specific past project is relevant to a client brief.

${styleGuide}

Return STRICT JSON: { "relevance": "<paragraph>" }. No preamble, no fences.`

  const user = `# Brief
${brief.trim()}

# Project
${JSON.stringify(project)}

Return JSON with the relevance paragraph.`

  return { system, user }
}

export function buildBuildPrompt(
  brief: string,
  name: string,
  projects: { id: string; client?: string; projectName?: string; relevance?: string }[],
  styleGuide: string
): { system: string; user: string } {
  const system = `You are a senior strategist at Accurat assembling a curated case-study collection in response to a client brief. You group selected projects into 2–4 thematic sections, each with a short title and a one-sentence subtitle.

${styleGuide}

Return STRICT JSON, no preamble, no fences. Schema:
{ "sections": [ { "title": "<short, no period>", "subtitle": "<one sentence>", "projectIds": ["..."] } ] }

Rules:
- Every projectId from the input list MUST appear in exactly one section.
- 2–4 sections total.
- Section titles should reflect the brief's framing, not generic labels.
- Sections must be ordered to tell a coherent story given the brief.`

  const user = `# Collection name
${name}

# Brief
${brief.trim()}

# Selected projects with relevance
${JSON.stringify(projects)}

Return JSON.`

  return { system, user }
}
