export function formatYearRange(start: number | null, end: number | null): string {
  if (!start && !end) return ''
  if (start && !end) return `${start} — Present`
  if (!start && end) return `${end}`
  if (start === end) return `${start}`
  return `${start} — ${end}`
}

export function isVideo(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ''
  return ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'].includes(ext)
}

export function isGif(filename: string): boolean {
  return filename.toLowerCase().endsWith('.gif')
}

export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileExt(filename: string): string {
  return (filename.split('.').pop() || '').toUpperCase()
}
