'use client'

import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  dark?: boolean
}

export function Breadcrumb({ items, dark }: BreadcrumbProps) {
  const router = useRouter()

  const baseColor = dark ? 'text-white/30' : 'text-[var(--c-gray-400)]'
  const separatorColor = dark ? 'text-white/20' : 'text-[var(--c-gray-300)]'
  const hoverColor = dark ? 'hover:text-white/60' : 'hover:text-[var(--c-gray-600)]'
  const activeColor = dark ? 'text-white/60 font-[450]' : 'text-[var(--c-gray-600)] font-[450]'

  return (
    <nav className={`flex items-center gap-1.5 h-6 text-[11px] ${baseColor}`}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className={separatorColor}>/</span>}
          {item.href && i < items.length - 1 ? (
            <button
              onClick={() => router.push(item.href!)}
              className={`${hoverColor} transition-colors`}
            >
              {item.label}
            </button>
          ) : (
            <span className={i === items.length - 1 ? activeColor : ''}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
