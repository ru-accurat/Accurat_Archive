export const IMAGE_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.heic', '.heif', '.avif',
  '.svg', '.tiff', '.tif', '.bmp',
])

export const VIDEO_EXTS = new Set([
  '.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v',
])

/** All supported media file extensions */
export const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS])

export function getMediaType(filename: string): 'image' | 'video' | 'gif' {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  if (ext === '.gif') return 'gif'
  if (VIDEO_EXTS.has(ext)) return 'video'
  return 'image'
}
