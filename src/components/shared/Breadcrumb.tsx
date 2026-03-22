'use client'

import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter()

  return (
    <nav className="flex items-center gap-1.5 h-6 text-[11px] text-[var(--c-gray-400)]">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--c-gray-300)]">/</span>}
          {item.href && i < items.length - 1 ? (
            <button
              onClick={() => router.push(item.href!)}
              className="hover:text-[var(--c-gray-600)] transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className={i === items.length - 1 ? 'text-[var(--c-gray-600)] font-[450]' : ''}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
