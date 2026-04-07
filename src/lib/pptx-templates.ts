/**
 * Centralized pitch deck layout definitions (colors, fonts, positions).
 * Used by /api/collections/[id]/export-pptx.
 */

export const DECK = {
  // Widescreen 16:9 — pptxgenjs "LAYOUT_WIDE" is 13.3 x 7.5 inches
  width: 13.3,
  height: 7.5,
  colors: {
    bg: 'FFFFFF',
    bgDark: '0A0A0A',
    accent: 'FF5A1F',
    text: '111111',
    textMuted: '6B6B6B',
    divider: 'E5E5E5',
  },
  fonts: {
    title: 'Helvetica',
    body: 'Helvetica',
  },
  sizes: {
    coverTitle: 44,
    coverSubtitle: 20,
    sectionTitle: 36,
    projectTitle: 28,
    projectSubtitle: 14,
    body: 12,
    caption: 10,
  },
} as const

export type DeckLayout = 'standard' | 'detailed'

/** Slide positions (inches) for common elements */
export const POS = {
  coverTitle: { x: 0.6, y: 2.9, w: 12.1, h: 1.3 },
  coverSubtitle: { x: 0.6, y: 4.25, w: 12.1, h: 0.6 },
  coverFooter: { x: 0.6, y: 6.8, w: 12.1, h: 0.4 },
  sectionTitle: { x: 0.6, y: 3.2, w: 12.1, h: 1.2 },
  sectionSubtitle: { x: 0.6, y: 4.5, w: 12.1, h: 0.5 },
  projectHeroFull: { x: 0, y: 0, w: 13.3, h: 7.5 },
  projectTitleOverlay: { x: 0.6, y: 6.0, w: 12.1, h: 0.7 },
  projectSubtitleOverlay: { x: 0.6, y: 6.7, w: 12.1, h: 0.4 },
  projectTitle: { x: 0.6, y: 0.5, w: 12.1, h: 0.7 },
  projectClient: { x: 0.6, y: 1.2, w: 12.1, h: 0.4 },
  projectBody: { x: 0.6, y: 1.8, w: 6.0, h: 5.2 },
  projectHeroRight: { x: 6.9, y: 1.8, w: 5.8, h: 5.2 },
  gridTL: { x: 0.6, y: 1.8, w: 6.0, h: 2.5 },
  gridTR: { x: 6.9, y: 1.8, w: 5.8, h: 2.5 },
  gridBL: { x: 0.6, y: 4.5, w: 6.0, h: 2.5 },
  gridBR: { x: 6.9, y: 4.5, w: 5.8, h: 2.5 },
  thankYouTitle: { x: 0.6, y: 3.0, w: 12.1, h: 1.3 },
  thankYouContact: { x: 0.6, y: 4.4, w: 12.1, h: 0.6 },
} as const
