import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import type { Project } from '@/lib/types'
import Anthropic from '@anthropic-ai/sdk'
import { scoreSimilarity } from '@/lib/similarity'

// Fallback guidelines used when ai_settings table is empty
const FALLBACK_GUIDELINES = `# Accurat Case Study Writing Guidelines

## General Principles
- Write for a prospective client, not a portfolio browser
- Ground in specifics, not superlatives — name the technology, quantify the outcome
- Show the thinking, not just the making — reveal how Accurat diagnosed the real problem
- Highlight the meeting-the-client-where-they-are moment
- Make emerging technologies tangible as strategic unlocks, not feature lists

## Description (3–5 sentences, 100–200 words)
Structure: Context (1 sentence) → What Accurat did (2–3 sentences) → Outcome/significance (1 sentence)
Tone: Direct, confident, precise. First person plural ("we"). No empty superlatives.
Avoid: Generic company descriptions, listing deliverables without thinking, "cutting-edge/innovative/state-of-the-art/leveraged/passionate"

## Challenge (1–2 sentences, 15–35 words)
Frame as tension, gap, or unmet need — not a task description. Make stakes clear. Third person.
Avoid: Restating the deliverable as the challenge, generic "needed a better solution"

## Solution (1–2 sentences, 15–35 words)
Lead with approach/insight, not the deliverable. Show how Accurat's capabilities made the difference. Connect back to challenge.
Avoid: Describing deliverable without why it mattered, generic outcome language

## Tagline (1 sentence)
Concise, compelling summary of the project. Should capture the essence of what was built and why.

## Deliverables (comma-separated list)
Specific output types: e.g., "Interactive dashboard, automated data pipeline, brand guidelines, AR experience"

## Vocabulary
Prefer: "data-native" over "data-driven", "deployable" over "deliverable", "Data Portrait" (capitalized), "execution as research"
Avoid: "cutting-edge", "leverage", "storytelling" without telling a story, "AI-powered" as standalone, "holistic/synergy/transformative"`

const FIELD_PROMPTS: Record<string, string> = {
  tagline: 'Write a concise tagline (one sentence) for this project.',
  description: 'Write a 2-3 paragraph project description (100-200 words).',
  challenge: 'Write the challenge (1-2 sentences, 15-35 words). Frame as tension or unmet need from the client\'s perspective.',
  solution: 'Write the solution (1-2 sentences, 15-35 words). Lead with the approach, connect back to the challenge.',
  deliverables: 'List the key deliverables as a comma-separated list.',
}

function formatProjectContext(project: Project): string {
  return `Client: ${project.client}
Project: ${project.projectName}
Unit: ${project.section}
Domains: ${project.domains.join(', ') || 'Not specified'}
Services: ${project.services.join(', ') || 'Not specified'}
Category: ${project.output || 'Not specified'}
Year: ${project.start || 'Unknown'}${project.end ? `–${project.end}` : ''}
${project.tagline ? `Current Tagline: ${project.tagline}` : ''}
${project.description ? `Current Description: ${project.description}` : ''}
${project.challenge ? `Current Challenge: ${project.challenge}` : ''}
${project.solution ? `Current Solution: ${project.solution}` : ''}
${project.deliverables ? `Current Deliverables: ${project.deliverables}` : ''}`
}

function formatExampleProject(p: Project): string {
  return `---
Client: ${p.client} | Project: ${p.projectName} | ${p.section} | ${p.start || ''}
${p.tagline ? `Tagline: ${p.tagline}` : ''}
${p.description ? `Description: ${p.description}` : ''}
${p.challenge ? `Challenge: ${p.challenge}` : ''}
${p.solution ? `Solution: ${p.solution}` : ''}
${p.deliverables ? `Deliverables: ${p.deliverables}` : ''}`
}

// Load guidelines from Supabase ai_settings table
async function loadGuidelines(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const { data } = await supabase
    .from('ai_settings')
    .select('key, value')

  if (!data || data.length === 0) return FALLBACK_GUIDELINES

  const settings: Record<string, string> = {}
  for (const row of data) {
    if (row.value) settings[row.key] = row.value
  }

  // If guidelines key has content, use it as the primary instruction
  // Append other reference docs as additional context
  const parts: string[] = []

  if (settings.guidelines) {
    parts.push(settings.guidelines)
  } else {
    parts.push(FALLBACK_GUIDELINES)
  }

  if (settings.voice) {
    parts.push('\n\n# Voice & Tone Reference\n' + settings.voice)
  }
  if (settings.company) {
    parts.push('\n\n# Company Background\n' + settings.company)
  }
  if (settings.market) {
    parts.push('\n\n# Market Positioning\n' + settings.market)
  }
  if (settings.projects) {
    parts.push('\n\n# Key Projects Reference\n' + settings.projects)
  }

  return parts.join('\n')
}

// POST /api/ai/generate
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const body = await request.json()
  const { projectId, mode = 'single', fieldName, notes, quality = 'fast' } = body

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  if (mode === 'single' && !fieldName) {
    return NextResponse.json({ error: 'fieldName is required for single mode' }, { status: 400 })
  }

  if (mode === 'single' && !FIELD_PROMPTS[fieldName]) {
    return NextResponse.json({ error: `No prompt defined for field: ${fieldName}` }, { status: 400 })
  }

  // Get the project
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const project = rowToProject(data as ProjectRow)
  const context = formatProjectContext(project)

  // Load guidelines from Supabase
  const systemPrompt = await loadGuidelines(supabase)

  // Get similar projects for few-shot examples
  const { data: allProjectsData } = await supabase.from('projects').select('*')
  const allProjects = (allProjectsData as ProjectRow[] || []).map(rowToProject)

  // Find 3 similar completed projects (with description + challenge + solution)
  const completedProjects = allProjects.filter(p =>
    p.id !== project.id && p.description && p.challenge && p.solution
  )

  const scored = completedProjects.map(p => ({
    project: p,
    score: scoreSimilarity(project, p),
  })).sort((a, b) => b.score - a.score)

  const examples = scored.slice(0, 3).map(s => s.project)
  const examplesText = examples.length > 0
    ? `\n\nHere are ${examples.length} similar completed case studies for reference. Match their voice and quality:\n\n${examples.map(formatExampleProject).join('\n')}`
    : ''

  // Build prompt
  const model = quality === 'premium' ? 'claude-opus-4-20250514' : 'claude-sonnet-4-20250514'
  const notesSection = notes ? `\n\nAdditional notes/context from the team (may be in Italian — translate and incorporate):\n${notes}` : ''

  // Detect if project already has content (iterative mode)
  const hasExistingContent = !!(project.description || project.challenge || project.solution || project.tagline)

  try {
    const anthropic = new Anthropic({ apiKey })

    if (mode === 'full') {
      let userPrompt: string

      if (hasExistingContent && notes) {
        // Iterative mode: refine existing content with new notes/feedback
        userPrompt = `You are editing an existing case study for an Accurat project. The current version is below. The user has provided feedback, corrections, or additional information. Integrate this new input into the existing case study, improving and restructuring as needed. You may significantly rewrite sections if the new information changes the narrative.${examplesText}

Current case study:
${context}${notesSection}

Return the COMPLETE updated version of all five fields (even if some didn't change), each on its own line with the label prefix:
TAGLINE: (one sentence)
DESCRIPTION: (100-200 words)
CHALLENGE: (15-35 words)
SOLUTION: (15-35 words)
DELIVERABLES: (comma-separated list)

Write only the content. No preamble, no explanation, no markdown formatting.`
      } else {
        // Fresh generation mode
        userPrompt = `Write a complete case study for the following Accurat project. Generate all five fields.${examplesText}

Project to write about:
${context}${notesSection}

Return ONLY the following fields, each on its own line with the label prefix:
TAGLINE: (one sentence)
DESCRIPTION: (100-200 words)
CHALLENGE: (15-35 words)
SOLUTION: (15-35 words)
DELIVERABLES: (comma-separated list)

Write only the content. No preamble, no explanation, no markdown formatting.`
      }

      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      // Parse fields from response
      const fields: Record<string, string> = {}
      const fieldNames = ['tagline', 'description', 'challenge', 'solution', 'deliverables']
      for (const f of fieldNames) {
        const regex = new RegExp(`${f.toUpperCase()}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, 's')
        const match = text.match(regex)
        if (match) fields[f] = match[1].trim()
      }

      return NextResponse.json({
        success: true,
        fields,
        isIterative: hasExistingContent && !!notes,
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
      })
    } else {
      // Single field mode
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Based on the following project context, ${FIELD_PROMPTS[fieldName]}${examplesText}

Project:
${context}${notesSection}

Write only the requested content, no preamble or labels.`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return NextResponse.json({
        success: true,
        text,
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
