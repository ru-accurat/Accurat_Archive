import type { MediaFile } from '@/lib/types'
import { mediaUrl } from '@/lib/media-url'
import { isVideo } from '@/lib/format'

interface Props {
  media: MediaFile | null
  folderName: string
  projectName: string
}

export function HeroSection({ media, folderName, projectName }: Props) {
  if (!media) {
    return (
      <div className="w-full aspect-[16/10] md:aspect-[21/9] bg-[var(--c-black)] flex items-center justify-center">
        <span className="text-white/20 text-[13px] font-[350] tracking-[0.02em]">No header image</span>
      </div>
    )
  }

  const src = media.path || mediaUrl(folderName, media.filename)

  if (isVideo(media.filename)) {
    return (
      <div className="w-full aspect-[16/10] md:aspect-[21/9] bg-[var(--c-black)] overflow-hidden">
        <video src={src} className="w-full h-full object-cover" controls preload="metadata" />
      </div>
    )
  }

  return (
    <div className="w-full aspect-[16/10] md:aspect-[21/9] bg-[var(--c-black)] overflow-hidden">
      <img src={src} alt={projectName} className="w-full h-full object-cover" loading="eager" />
    </div>
  )
}
