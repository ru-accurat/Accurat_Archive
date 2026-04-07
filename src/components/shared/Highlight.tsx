'use client'

import { Fragment } from 'react'

interface Props {
  text: string
  match: string
  className?: string
}

export function Highlight({ text, match, className }: Props) {
  if (!match || !text) {
    return <span className={className}>{text}</span>
  }

  const lowerText = text.toLowerCase()
  const lowerMatch = match.toLowerCase()
  const idx = lowerText.indexOf(lowerMatch)

  if (idx === -1) {
    return <span className={className}>{text}</span>
  }

  const before = text.slice(0, idx)
  const hit = text.slice(idx, idx + match.length)
  const after = text.slice(idx + match.length)

  return (
    <span className={className}>
      {before}
      <mark className="bg-yellow-200 text-inherit rounded-[1px] px-[1px]">{hit}</mark>
      {after}
    </span>
  )
}
