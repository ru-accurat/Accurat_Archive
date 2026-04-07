// Constants for the In-Use Image Generator form.

export type DeviceKind = 'digital' | 'print'

export interface DeviceOption {
  key: string
  label: string
  kind: DeviceKind
}

export const DEVICES: DeviceOption[] = [
  // Digital
  { key: 'wall_projection', label: 'Wall projection', kind: 'digital' },
  { key: 'wall_screen', label: 'Wall screen', kind: 'digital' },
  { key: 'desktop_computer', label: 'Desktop computer', kind: 'digital' },
  { key: 'laptop', label: 'Laptop', kind: 'digital' },
  { key: 'tablet', label: 'Tablet', kind: 'digital' },
  { key: 'smartphone', label: 'Smartphone', kind: 'digital' },
  { key: 'smartwatch', label: 'Smartwatch', kind: 'digital' },
  { key: 'tv', label: 'TV', kind: 'digital' },
  { key: 'kiosk', label: 'Kiosk / touchscreen', kind: 'digital' },
  // Print
  { key: 'magazine', label: 'Magazine', kind: 'print' },
  { key: 'book', label: 'Book', kind: 'print' },
  { key: 'leaflet', label: 'Leaflet', kind: 'print' },
  { key: 'poster', label: 'Poster', kind: 'print' },
  { key: 'billboard', label: 'Billboard', kind: 'print' },
]

export const PRINT_KEYS: ReadonlySet<string> = new Set(
  DEVICES.filter((d) => d.kind === 'print').map((d) => d.key)
)

export interface SurfaceOption {
  key: string
  label: string
  phrasing: string
}

export const SURFACES: SurfaceOption[] = [
  { key: 'held_in_hands', label: 'Held in hands', phrasing: "held in someone's hands" },
  { key: 'desk_or_table', label: 'On a desk or table', phrasing: 'lying flat on a desk or table' },
  { key: 'wall_mounted', label: 'Mounted on a wall', phrasing: 'mounted on a wall' },
  { key: 'stand_or_easel', label: 'On a stand / easel', phrasing: 'displayed on a stand or easel' },
  { key: 'leaning_wall', label: 'Leaning against a wall', phrasing: 'leaning against a wall' },
]

export type FramingKey = 'hands_only' | 'above_shoulder' | 'half_figure' | 'full_figure'

export interface FramingOption {
  key: FramingKey
  label: string
  phrasing: string
}

export const FRAMINGS: FramingOption[] = [
  {
    key: 'hands_only',
    label: 'Hands only on device/support',
    phrasing:
      'Show only the hands interacting with the device. No face, no shoulders, no head — only forearms and hands. The device fills 60–70% of the frame.',
  },
  {
    key: 'above_shoulder',
    label: 'Above shoulder (over-the-shoulder shot)',
    phrasing:
      'Over-the-shoulder shot showing the back of the head and shoulders, with the device clearly visible and in focus in front of the person.',
  },
  {
    key: 'half_figure',
    label: 'Half figure (waist up)',
    phrasing:
      'Half figure of a person from the waist up, partially angled toward the device. The device remains the visual hero.',
  },
  {
    key: 'full_figure',
    label: 'Full figure',
    phrasing:
      'Full figure of a person interacting with the device in the environment. The device must still occupy at least 40% of the frame.',
  },
]

export interface EnvironmentPreset {
  key: string
  label: string
  description: string
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    key: 'modern_corporate_office',
    label: 'Modern corporate office',
    description:
      'A modern corporate office with large glass partitions, warm wood accents, and natural daylight from floor-to-ceiling windows.',
  },
  {
    key: 'home_office',
    label: 'Home office / desk',
    description:
      'A tidy home office with a wooden desk, a ceramic mug, a small plant, and soft window light from the side.',
  },
  {
    key: 'cafe_coworking',
    label: 'Cafe or coworking space',
    description:
      'A relaxed cafe or coworking space with warm ambient lighting, blurred patrons in the background, and a wooden tabletop.',
  },
  {
    key: 'conference_stage',
    label: 'Conference / event stage',
    description:
      'A large conference or event stage with dramatic stage lighting, a dark audience visible in the background, and a wide backdrop.',
  },
  {
    key: 'trade_show_booth',
    label: 'Trade show booth',
    description:
      'A bright trade show booth with clean branded walls, overhead spotlights, and a polished exhibition floor.',
  },
  {
    key: 'museum_gallery',
    label: 'Museum or gallery',
    description:
      'A minimalist museum gallery with white walls, polished concrete floors, and soft diffused overhead lighting.',
  },
  {
    key: 'library_reading_room',
    label: 'Library / reading room',
    description:
      'A quiet library reading room with tall wooden bookshelves, green desk lamps, and warm afternoon light.',
  },
  {
    key: 'outdoor_urban',
    label: 'Outdoor urban setting',
    description:
      'An outdoor urban setting with modern architecture, soft overcast daylight, and a blurred cityscape in the background.',
  },
  {
    key: 'living_room',
    label: 'Living room',
    description:
      'A contemporary living room with a linen sofa, a wooden coffee table, and soft natural light from a large window.',
  },
  {
    key: 'studio_minimal',
    label: 'Studio / minimal background',
    description:
      'A clean studio set with a seamless neutral backdrop, soft diffused lighting, and no visible props.',
  },
  {
    key: 'custom',
    label: 'Custom…',
    description: '',
  },
]
