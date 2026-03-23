'use client'

import { useState, useRef, useEffect } from 'react'

interface SharePopoverProps {
  shareToken: string | null | undefined
  onCreateLink?: () => Promise<void>
  onDisableLink?: () => Promise<void>
  baseUrl?: string
}

export function SharePopover({ shareToken, onCreateLink, onDisableLink, baseUrl = '/share' }: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}${baseUrl}/${shareToken}` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreate = async () => {
    if (!onCreateLink) return
    setLoading(true)
    try {
      await onCreateLink()
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!onDisableLink) return
    setLoading(true)
    try {
      await onDisableLink()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] font-[400] tracking-[0.02em] px-3 py-1.5 text-[var(--c-gray-400)] hover:text-[var(--c-gray-700)] transition-colors duration-200"
      >
        Share
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-72 bg-[var(--c-white)] border border-[var(--c-gray-200)] rounded-[var(--radius-md)] shadow-lg p-4 z-50">
          {shareToken ? (
            <div>
              <p className="text-[11px] font-[450] text-[var(--c-gray-700)] mb-2">Shareable link</p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-[11px] text-[var(--c-gray-500)] bg-[var(--c-gray-50)] border border-[var(--c-gray-200)] rounded-[var(--radius-sm)] px-2.5 py-1.5 outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="text-[10px] font-[500] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {onDisableLink && (
                <button
                  onClick={handleDisable}
                  disabled={loading}
                  className="text-[10px] text-[var(--c-gray-400)] hover:text-[var(--c-error)] transition-colors"
                >
                  Disable link
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-[var(--c-gray-500)] mb-3">Create a shareable link for anyone to view.</p>
              <button
                onClick={handleCreate}
                disabled={loading || !onCreateLink}
                className="text-[11px] font-[500] px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--c-gray-900)] text-white hover:bg-[var(--c-gray-800)] transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create link'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
