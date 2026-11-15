import { formatYearRange } from '@/lib/format'

interface Props {
  client: string
  start: number | null
  end: number | null
  tier: number
}

export function MetadataBar({ client, start, end, tier }: Props) {
  return (
    <div className="flex items-center gap-5 text-[13px]">
      <span className="font-[500] text-[var(--c-gray-900)]">{client}</span>

      {(start || end) && (
        <span className="text-[var(--c-gray-400)] font-[400] tabular-nums">{formatYearRange(start, end)}</span>
      )}

      <span className="text-[10px] font-[400] tracking-[0.04em] text-[var(--c-gray-400)] uppercase">
        Tier {tier}
      </span>
    </div>
  )
}
