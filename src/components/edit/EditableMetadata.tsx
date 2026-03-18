'use client'

interface Props {
  client: string
  start: number | null
  end: number | null
  section: string
  tier: number
  output: string
  onClientChange: (v: string) => void
  onStartChange: (v: number | null) => void
  onEndChange: (v: number | null) => void
  onSectionChange: (v: string) => void
  onTierChange: (v: number) => void
  onOutputChange: (v: string) => void
  outputOptions: string[]
}

const inputClass = "w-full px-0 py-2 text-[13px] font-[400] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)]"
const selectClass = "w-full px-0 py-2 text-[13px] font-[400] bg-white border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)] cursor-pointer"
const labelClass = "text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-1"

export function EditableMetadata({
  client,
  start,
  end,
  section,
  tier,
  output,
  onClientChange,
  onStartChange,
  onEndChange,
  onSectionChange,
  onTierChange,
  onOutputChange,
  outputOptions
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-6 py-5">
      <div>
        <label className={labelClass}>Client</label>
        <input
          type="text"
          value={client}
          onChange={(e) => onClientChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={labelClass}>Start</label>
          <input
            type="number"
            value={start ?? ''}
            onChange={(e) => onStartChange(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Year"
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>End</label>
          <input
            type="number"
            value={end ?? ''}
            onChange={(e) => onEndChange(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Year"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={labelClass}>Unit</label>
          <select
            value={section}
            onChange={(e) => onSectionChange(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            <option value="Studio">Studio</option>
            <option value="Tech">Tech</option>
            <option value="Studio, Tech">Studio, Tech</option>
          </select>
        </div>
        <div className="w-20">
          <label className={labelClass}>Tier</label>
          <select
            value={tier}
            onChange={(e) => onTierChange(parseInt(e.target.value))}
            className={selectClass}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
      </div>

      <div className="col-span-3 relative z-10">
        <label className={labelClass}>Category</label>
        <select
          value={output}
          onChange={(e) => onOutputChange(e.target.value)}
          className={selectClass}
        >
          <option value="">—</option>
          {outputOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
