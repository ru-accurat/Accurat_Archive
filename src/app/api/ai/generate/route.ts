import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rowToProject } from '@/lib/db-utils'
import type { ProjectRow } from '@/lib/db-utils'
import Anthropic from '@anthropic-ai/sdk'

const FIELD_PROMPTS: Record<string, string> = {
  tagline: 'Write a concise tagline (one sentence) for this project.',
  description: 'Write a 2-3 paragraph project description.',
  challenge: 'Describe the main challenge or problem this project addressed.',
  solution: 'Describe the solution and approach taken.',
  deliverables: 'List the key deliverables of this project.',
}

// POST /api/ai/generate
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()
  const { projectId, fieldName } = await request.json()

  if (!projectId || !fieldName) {
    return NextResponse.json({ error: 'projectId and fieldName are required' }, { status: 400 })
  }

  const fieldPrompt = FIELD_PROMPTS[fieldName]
  if (!fieldPrompt) {
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

  const context = `Project: ${project.fullName}
Client: ${project.client}
Unit: ${project.section}
Domains: ${project.domains.join(', ')}
Services: ${project.services.join(', ')}
Category: ${project.output}
Year: ${project.start || 'Unknown'}${project.end ? `-${project.end}` : ''}
${project.tagline ? `Tagline: ${project.tagline}` : ''}
${project.description ? `Description: ${project.description}` : ''}
${project.challenge ? `Challenge: ${project.challenge}` : ''}
${project.solution ? `Solution: ${project.solution}` : ''}
${project.deliverables ? `Deliverables: ${project.deliverables}` : ''}`

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are writing content for Accurat, a data-driven design studio. Based on the following project context, ${fieldPrompt}\n\nContext:\n${context}\n\nWrite only the requested content, no preamble or labels.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ success: true, text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
