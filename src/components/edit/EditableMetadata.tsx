'use client'

import { LocationAutocomplete } from './LocationAutocomplete'

interface Props {
  client: string
  client2: string
  agency: string
  start: number | null
  end: number | null
  section: string
  tier: number
  output: string
  status: 'draft' | 'internal' | 'public'
  locationName: string
  latitude: number | null
  longitude: number | null
  onClientChange: (v: string) => void
  onClient2Change: (v: string) => void
  onAgencyChange: (v: string) => void
  onStartChange: (v: number | null) => void
  onEndChange: (v: number | null) => void
  onSectionChange: (v: string) => void
  onTierChange: (v: number) => void
  onOutputChange: (v: string) => void
  onStatusChange: (v: 'draft' | 'internal' | 'public') => void
  onLocationNameChange: (v: string) => void
  onLatitudeChange: (v: number | null) => void
  onLongitudeChange: (v: number | null) => void
  outputOptions: string[]
}

const inputClass = "w-full px-0 py-2 text-[13px] font-[400] bg-transparent border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)]"
const selectClass = "w-full px-0 py-2 text-[13px] font-[400] bg-white border-b border-[var(--c-gray-200)] focus:border-[var(--c-gray-900)] focus:outline-none transition-colors duration-200 text-[var(--c-gray-800)] cursor-pointer"
const labelClass = "text-[10px] font-[500] uppercase tracking-[0.1em] text-[var(--c-gray-400)] block mb-1"

export function EditableMetadata({
  client,
  client2,
  agency,
  start,
  end,
  section,
  tier,
  output,
  status,
  locationName,
  latitude,
  longitude,
  onClientChange,
  onClient2Change,
  onAgencyChange,
  onStartChange,
  onEndChange,
  onSectionChange,
  onTierChange,
  onOutputChange,
  onStatusChange,
  onLocationNameChange,
  onLatitudeChange,
  onLongitudeChange,
  outputOptions
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-5">
      <div>
        <label className={labelClass}>Client</label>
        <input
          type="text"
          value={client}
          onChange={(e) => onClientChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Client 2</label>
        <input
          type="text"
          value={client2}
          onChange={(e) => onClient2Change(e.target.value)}
          placeholder="—"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Agency</label>
        <input
          type="text"
          value={agency}
          onChange={(e) => onAgencyChange(e.target.value)}
          placeholder="—"
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

      <div className="relative z-10">
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

      <div className="relative z-10">
        <label className={labelClass}>Status</label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as 'draft' | 'internal' | 'public')}
          className={selectClass}
        >
          <option value="draft">Draft</option>
          <option value="internal">Internal</option>
          <option value="public">Public</option>
        </select>
      </div>

      <div className="sm:col-span-2 md:col-span-2">
        <label className={labelClass}>
          Location
          {(latitude != null || longitude != null) && (
            <span className="ml-2 normal-case tracking-normal text-[var(--c-gray-400)]">
              {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
            </span>
          )}
        </label>
        <LocationAutocomplete
          locationName={locationName}
          inputClassName={inputClass}
          onSelect={(name, lat, lon) => {
            onLocationNameChange(name)
            onLatitudeChange(lat)
            onLongitudeChange(lon)
          }}
          onNameChange={(name) => onLocationNameChange(name)}
        />
      </div>
    </div>
  )
}
