const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/** Get public URL for a project media file from Supabase Storage */
export function mediaUrl(folderName: string, filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/project-media/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`
}

/** Get public URL for a client logo from Supabase Storage */
export function logoUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/logos/${encodeURIComponent(filename)}`
}
