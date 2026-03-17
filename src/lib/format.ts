export function formatYearRange(start: number | null, end: number | null): string {
  if (!start && !end) return ''
  if (start && !end) return `${start} — Present`
  if (!start && end) return `${end}`
  if (start === end) return `${start}`
  return `${start} — ${end}`
}

export function isVideo(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ''
  return ['mp4', 'mov', 'avi', 'webm'].includes(ext)
}

export function isGif(filename: string): boolean {
  return filename.toLowerCase().endsWith('.gif')
}
