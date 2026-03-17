import type { MediaFile } from '@/lib/types'
import { isVideo } from '@/lib/format'

interface Props {
  media: MediaFile
  folderName: string
}

export function ImageSection({ media }: Props) {
  const src = media.path

  if (isVideo(media.filename)) {
    return <div className="w-full"><video src={src} className="w-full" controls preload="metadata" /></div>
  }

  return <div className="w-full"><img src={src} alt="" className="w-full" loading="lazy" /></div>
}
