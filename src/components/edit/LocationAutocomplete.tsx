'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Props {
  locationName: string
  onSelect: (name: string, lat: number | null, lon: number | null) => void
  /** Called for free-text fallback when user blurs without picking a result */
  onNameChange?: (name: string) => void
  placeholder?: string
  inputClassName?: string
  autoFocus?: boolean
}

export function LocationAutocomplete({
  locationName,
  onSelect,
  onNameChange,
  placeholder = 'e.g. Milan, Italy',
  inputClassName,
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState(locationName ?? '')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pickedRef = useRef(false)

  // Sync external value when not actively editing
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQuery(locationName ?? '')
    }
  }, [locationName])

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const runSearch = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        }
      )
      if (!res.ok) throw new Error('Nominatim error')
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setOpen(true)
      setHighlight(-1)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('LocationAutocomplete fetch failed:', err)
        setResults([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    pickedRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim() || value.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      runSearch(value.trim())
    }, 300)
  }

  const pick = (r: NominatimResult) => {
    pickedRef.current = true
    const lat = parseFloat(r.lat)
    const lon = parseFloat(r.lon)
    setQuery(r.display_name)
    setOpen(false)
    setResults([])
    onSelect(r.display_name, isNaN(lat) ? null : lat, isNaN(lon) ? null : lon)
  }

  const handleBlur = () => {
    // Delay so click on dropdown can register first
    setTimeout(() => {
      if (containerRef.current && containerRef.current.contains(document.activeElement)) {
        return
      }
      setOpen(false)
      if (!pickedRef.current && query !== (locationName ?? '')) {
        // Free-text fallback: keep name, leave lat/lon untouched
        onNameChange?.(query)
      }
    }, 150)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!pickedRef.current && query !== (locationName ?? '')) {
          onNameChange?.(query)
        }
        inputRef.current?.blur()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && highlight < results.length) {
        pick(results[highlight])
      } else {
        if (!pickedRef.current && query !== (locationName ?? '')) {
          onNameChange?.(query)
        }
        setOpen(false)
        inputRef.current?.blur()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] shadow-lg max-h-[280px] overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="px-3 py-2 text-[12px] text-[var(--c-gray-400)]">Searching…</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.place_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(r) }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-[12px] block border-b border-[var(--c-gray-100)] last:border-b-0 ${
                i === highlight ? 'bg-[var(--c-gray-50)]' : 'bg-white'
              } text-[var(--c-gray-800)]`}
            >
              {r.display_name}
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-[var(--c-gray-400)] border-t border-[var(--c-gray-100)] bg-[var(--c-gray-50)]">
            © OpenStreetMap contributors
          </div>
        </div>
      )}
    </div>
  )
}
