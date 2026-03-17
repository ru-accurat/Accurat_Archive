interface Props {
  team: string[]
  dark?: boolean
}

export function TeamList({ team, dark = false }: Props) {
  if (team.length === 0) {
    return (
      <div>
        <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-3 ${
          dark ? 'text-white/30' : 'text-[var(--c-gray-400)]'
        }`}>
          Team
        </h3>
        <div className={`text-[13px] font-[350] italic ${
          dark ? 'text-white/15' : 'text-[var(--c-gray-300)]'
        }`}>
          No team listed
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-[10px] font-[500] uppercase tracking-[0.1em] mb-4 ${
        dark ? 'text-white/40' : 'text-[var(--c-gray-400)]'
      }`}>
        Team
      </h3>
      <div className={`text-[13px] leading-[1.8] font-[400] ${
        dark ? 'text-white/60' : 'text-[var(--c-gray-500)]'
      }`}>
        {team.join(', ')}
      </div>
    </div>
  )
}
