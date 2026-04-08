'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'

interface Action {
  id: string
  label: string
  icon?: string
  group: string
  shortcut?: string
  onExecute: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = useCallback(
    (path: string) => {
      router.push(path)
      setOpen(false)
    },
    [router]
  )

  const actions: Action[] = [
    { id: 'nav-projects', label: 'Projects', icon: '▦', group: 'Navigation', onExecute: () => go('/') },
    { id: 'nav-timeline', label: 'Timeline', icon: '⏱', group: 'Navigation', onExecute: () => go('/timeline') },
    { id: 'nav-map', label: 'Map', icon: '◎', group: 'Navigation', onExecute: () => go('/map') },
    { id: 'nav-collections', label: 'Collections', icon: '❐', group: 'Navigation', onExecute: () => go('/collections') },
    { id: 'nav-tags', label: 'Tags', icon: '#', group: 'Navigation', onExecute: () => go('/tags') },
    { id: 'nav-activity', label: 'Activity', icon: '~', group: 'Navigation', onExecute: () => go('/activity') },
    { id: 'nav-engagements', label: 'Engagements', icon: '$', group: 'Navigation', onExecute: () => go('/engagements') },
    { id: 'nav-clients', label: 'Clients', icon: '◯', group: 'Navigation', onExecute: () => go('/clients') },
    { id: 'nav-settings', label: 'Settings', icon: '⚙', group: 'Navigation', onExecute: () => go('/settings') },
    { id: 'nav-ai-settings', label: 'AI Settings', icon: '✦', group: 'Navigation', onExecute: () => go('/settings/ai') },
    { id: 'create-project', label: 'New Project', icon: '+', group: 'Create', shortcut: 'N', onExecute: () => go('/new') },
    { id: 'import-csv', label: 'Import CSV', icon: '↑', group: 'Import', onExecute: () => go('/settings') },
    { id: 'import-xlsx', label: 'Import XLSX (Engagements)', icon: '↑', group: 'Import', onExecute: () => go('/engagements') },
    {
      id: 'view-table',
      label: 'Switch to table view',
      icon: '≡',
      group: 'View',
      onExecute: () => {
        try {
          window.dispatchEvent(new CustomEvent('archive:set-view', { detail: 'table' }))
        } catch {}
        setOpen(false)
      },
    },
    {
      id: 'view-grid',
      label: 'Switch to grid view',
      icon: '▦',
      group: 'View',
      onExecute: () => {
        try {
          window.dispatchEvent(new CustomEvent('archive:set-view', { detail: 'grid' }))
        } catch {}
        setOpen(false)
      },
    },
    {
      id: 'clear-filters',
      label: 'Clear filters',
      icon: '×',
      group: 'Utility',
      onExecute: () => {
        try {
          window.dispatchEvent(new CustomEvent('archive:clear-filters'))
        } catch {}
        setOpen(false)
      },
    },
    {
      id: 'toggle-edit',
      label: 'Toggle edit mode',
      icon: '✎',
      group: 'Utility',
      onExecute: () => {
        try {
          window.dispatchEvent(new CustomEvent('archive:toggle-edit'))
        } catch {}
        setOpen(false)
      },
    },
  ]

  const groups = Array.from(new Set(actions.map((a) => a.group)))

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[560px] mx-4 bg-white rounded-[10px] border border-gray-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="flex flex-col">
          <div className="flex items-center border-b border-gray-200 px-4">
            <span className="text-gray-400 text-[13px] mr-2">⌘K</span>
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="flex-1 h-12 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-[13px] text-gray-400">
              No results found.
            </Command.Empty>
            {groups.map((g) => (
              <Command.Group
                key={g}
                heading={g}
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-gray-400"
              >
                {actions
                  .filter((a) => a.group === g)
                  .map((a) => (
                    <Command.Item
                      key={a.id}
                      value={`${a.group} ${a.label}`}
                      onSelect={() => a.onExecute()}
                      className="flex items-center gap-3 px-2 py-2 rounded-md text-[13px] text-gray-700 cursor-pointer aria-selected:bg-gray-100 aria-selected:text-gray-900"
                    >
                      {a.icon && (
                        <span className="w-5 text-center text-gray-400">{a.icon}</span>
                      )}
                      <span className="flex-1">{a.label}</span>
                      {a.shortcut && (
                        <span className="text-[11px] text-gray-400 font-mono">{a.shortcut}</span>
                      )}
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="border-t border-gray-200 px-3 py-2 flex items-center gap-3 text-[11px] text-gray-400">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>esc Close</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
