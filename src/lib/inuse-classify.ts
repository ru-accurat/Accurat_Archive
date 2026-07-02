import { GoogleGenAI } from '@google/genai'

/** Classification of a candidate source image. Only `ui` and `mockup` are
 *  usable as reference material for an in-use shot. */
export type SourceKind = 'ui' | 'mockup' | 'photo' | 'other'

export interface ClassifyResult {
  kind: SourceKind
  aspectRatio: number
  width: number
  height: number
}

/** Ask a fast Gemini model to classify the image and return dimensions.
 *  ~1s, ~$0.001 per call. */
export async function classifySourceImage(
  apiKey: string,
  mime: string,
  base64: string,
): Promise<ClassifyResult> {
  const ai = new GoogleGenAI({ apiKey })

  // Extract dimensions from the image bytes locally (no extra API call).
  const dims = await extractDimensions(mime, base64)

  const prompt = `You are classifying an image for use as reference material in a product mockup.

Look at the provided image and answer with ONE word, no explanation, from this list:

- ui       — a screenshot of a digital user interface (dashboard, app, website, data visualization on screen)
- mockup   — a rendered design mockup or illustration of a digital product / print artifact
- photo    — a photograph of a physical object, place, person, or environment (NOT a screenshot)
- other    — anything that doesn't fit above (abstract art, logo, chart printed on paper being photographed, etc.)

Answer with only the single word.`

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: mime, data: base64 } },
          { text: prompt },
        ],
      }],
    })
    const text = (res.candidates?.[0]?.content?.parts || [])
      .map(p => (p.text || '')).join(' ')
      .trim().toLowerCase().replace(/[^a-z]/g, '')
    const kind: SourceKind = (['ui', 'mockup', 'photo', 'other'] as SourceKind[]).includes(text as SourceKind)
      ? (text as SourceKind)
      : 'other'
    return { kind, aspectRatio: dims.width / dims.height, width: dims.width, height: dims.height }
  } catch (err) {
    // If classification fails, treat as `other` — caller will fall back.
    console.warn(`  ! classify failed: ${err instanceof Error ? err.message : err}`)
    return { kind: 'other', aspectRatio: dims.width / dims.height, width: dims.width, height: dims.height }
  }
}

/** Minimal dimension extraction from image bytes. Supports PNG, JPEG, WebP,
 *  GIF via signature parsing — no extra dependency. Returns 1x1 on failure
 *  so callers still get a defined aspectRatio (which will be 1.0). */
async function extractDimensions(mime: string, base64: string): Promise<{ width: number; height: number }> {
  const buf = Buffer.from(base64, 'base64')
  try {
    if (mime === 'image/png' || (buf[0] === 0x89 && buf[1] === 0x50)) {
      // PNG IHDR chunk: 16..24
      const w = buf.readUInt32BE(16)
      const h = buf.readUInt32BE(20)
      return { width: w, height: h }
    }
    if (mime === 'image/jpeg' || (buf[0] === 0xFF && buf[1] === 0xD8)) {
      // Scan JPEG segments for SOF marker
      let i = 2
      while (i < buf.length) {
        if (buf[i] !== 0xFF) break
        const marker = buf[i + 1]
        const len = buf.readUInt16BE(i + 2)
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
          const h = buf.readUInt16BE(i + 5)
          const w = buf.readUInt16BE(i + 7)
          return { width: w, height: h }
        }
        i += 2 + len
      }
    }
    if (mime === 'image/webp' || buf.slice(0, 4).toString('ascii') === 'RIFF') {
      // VP8L: signature at offset 12 == 'VP8L', dims at 21..25
      const type = buf.slice(12, 16).toString('ascii')
      if (type === 'VP8L') {
        const b = buf.readUInt32LE(21)
        const w = (b & 0x3FFF) + 1
        const h = ((b >> 14) & 0x3FFF) + 1
        return { width: w, height: h }
      }
      if (type === 'VP8 ') {
        // VP8 keyframe start at offset 30
        const w = buf.readUInt16LE(26) & 0x3FFF
        const h = buf.readUInt16LE(28) & 0x3FFF
        return { width: w, height: h }
      }
      if (type === 'VP8X') {
        // Extended format — canvas width/height at 24..30 as 24-bit LE
        const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1
        const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
        return { width: w, height: h }
      }
    }
    if (mime === 'image/gif' || buf.slice(0, 3).toString('ascii') === 'GIF') {
      const w = buf.readUInt16LE(6)
      const h = buf.readUInt16LE(8)
      return { width: w, height: h }
    }
  } catch {
    // fallthrough
  }
  return { width: 1, height: 1 }
}
