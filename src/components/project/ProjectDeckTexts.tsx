'use client'

import type { Project } from '@/lib/types'
import { InlineEditableField } from '@/components/edit/InlineEditableField'

interface Props {
  project: Project
  onUpdate: (field: keyof Project, value: unknown) => Promise<void>
}

/** Deck family texts: What we made, and How we worked (Challenge, Our role and process, Outcome). */
export function ProjectDeckTexts({ project, onUpdate }: Props) {
  const isAi = (f: string) => project.aiGenerated?.includes(f) || false
  const empty = !project.whatWeMade && !project.deckChallenge && !project.roleAndProcess && !project.outcome

  return (
    <section className="bg-[var(--c-white)] border-b border-[var(--c-gray-200)]" aria-labelledby="deck-texts-heading">
      <div className="max-w-[1040px] px-4 sm:px-6 md:px-[48px] pt-16 pb-12 space-y-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="deck-texts-heading" className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)]">
            Deck texts <span className="normal-case tracking-normal font-[400]">(used by the website)</span>
          </h2>
          {empty && <span className="text-[11px] text-[var(--c-gray-400)]">Empty for this project</span>}
        </div>
        <InlineEditableField
          title="What we made"
          value={project.whatWeMade || ''}
          onSave={(v) => onUpdate('whatWeMade', v)}
          placeholder="Add what we made…"
          isAiGenerated={isAi('whatWeMade') || isAi('what_we_made')}
        />
        <div>
          <h3 className="text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] mb-6">How we worked</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <InlineEditableField
              title="Challenge"
              value={project.deckChallenge || ''}
              onSave={(v) => onUpdate('deckChallenge', v)}
              placeholder="Add the challenge…"
              isAiGenerated={isAi('deckChallenge') || isAi('deck_challenge')}
            />
            <InlineEditableField
              title="Our role and process"
              value={project.roleAndProcess || ''}
              onSave={(v) => onUpdate('roleAndProcess', v)}
              placeholder="Add our role and process…"
              isAiGenerated={isAi('roleAndProcess') || isAi('role_and_process')}
            />
            <InlineEditableField
              title="Outcome"
              value={project.outcome || ''}
              onSave={(v) => onUpdate('outcome', v)}
              placeholder="Add the outcome…"
              isAiGenerated={isAi('outcome')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
