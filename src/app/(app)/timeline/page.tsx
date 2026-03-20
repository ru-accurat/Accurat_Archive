'use client'

import { useProjects } from '@/hooks/use-projects'
import { useProjectStore } from '@/stores/project-store'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'

const UNIT_COLORS: Record<string, string> = {
  'Studio': '#3b82f6',
  'Tech': '#22c55e',
  'Studio, Tech': '#a78bfa',
}

const ROW_H = 28
const YEAR_W = 120
const LEFT_W = 200

export default function TimelinePage() {
  const { loading } = useProjects()
  const projects = useProjectStore((s) => s.projects)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const { sorted, minYear, maxYear } = useMemo(() => {
    const withYears = projects.filter((p) => p.start)
    const years = withYears.map((p) => p.start!).concat(withYears.filter((p) => p.end).map((p) => p.end!))
    const min = years.length ? Math.min(...years) : 2010
    const max = years.length ? Math.max(...years) : 2026
    const sorted = [...withYears].sort((a, b) => (a.start || 0) - (b.start || 0) || a.client.localeCompare(b.client))
    return { sorted, minYear: min, maxYear: max + 1 }
  }, [projects])

  const yearCount = maxYear - minYear + 1
  const years = Array.from({ length: yearCount }, (_, i) => minYear + i)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      <div className="px-4 sm:px-6 md:px-[48px] pt-5 pb-3">
        <h1 className="text-[1.1rem] font-[350] tracking-[-0.01em] text-[var(--c-gray-900)]">
          Timeline
        </h1>
        <p className="text-[12px] text-[var(--c-gray-400)] mt-1">
          {sorted.length} projects with dates
        </p>
      </div>

      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div style={{ minWidth: LEFT_W + yearCount * YEAR_W }}>
          {/* Year headers */}
          <div className="sticky top-0 z-10 bg-[var(--c-white)] border-b border-[var(--c-gray-200)] flex">
            <div className="shrink-0" style={{ width: LEFT_W }} />
            {years.map((y) => (
              <div
                key={y}
                className="text-[10px] font-[500] text-[var(--c-gray-400)] text-center py-2"
                style={{ width: YEAR_W }}
              >
                {y}
              </div>
            ))}
          </div>

          {/* Project rows */}
          {sorted.map((p) => {
            const startOffset = ((p.start || minYear) - minYear) * YEAR_W
            const duration = ((p.end || p.start || minYear) - (p.start || minYear) + 1) * YEAR_W
            const color = UNIT_COLORS[p.section] || '#94a3b8'
            const isHovered = hoveredId === p.id

            return (
              <div
                key={p.id}
                className="flex items-center border-b border-[var(--c-gray-50)] hover:bg-[var(--c-gray-50)] transition-colors cursor-pointer"
                style={{ height: ROW_H }}
                onClick={() => router.push(`/project/${p.id}`)}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="shrink-0 px-3 truncate text-[11px] font-[400] text-[var(--c-gray-600)]"
                  style={{ width: LEFT_W }}
                  title={`${p.client} — ${p.projectName}`}
                >
                  <span className="font-[500] text-[var(--c-gray-800)]">{p.client}</span>
                  <span className="text-[var(--c-gray-400)]"> — {p.projectName}</span>
                </div>
                <div className="relative flex-1" style={{ height: ROW_H }}>
                  <div
                    className="absolute top-1 rounded-[2px] transition-opacity duration-150"
                    style={{
                      left: startOffset,
                      width: Math.max(duration, 8),
                      height: ROW_H - 8,
                      backgroundColor: color,
                      opacity: isHovered ? 1 : 0.6,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
