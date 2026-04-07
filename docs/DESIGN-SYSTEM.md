# Design System

Source of truth: `src/app/globals.css`. All tokens are CSS custom properties under the `--c-*` (color), `--radius-*` (radius), and `--topbar-h` namespaces. Tailwind is used via arbitrary value syntax (`text-[var(--c-gray-900)]`, `bg-[var(--c-white)]`, etc.) — there is no Tailwind theme extension.

## Neutral scale

| Token | Value | Usage count (tsx/ts) | Notes |
|---|---|---|---|
| `--c-black` | `#0a0a0a` | 25 | Presentation/dark surfaces (`/project/[id]`, `/new`, public presentation) |
| `--c-white` | `#ffffff` | 60 | Default app background, card surfaces |
| `--c-off-white` | `#f7f7f5` | 0 | Defined but not yet referenced |
| `--c-gray-50` | `#fafaf9` | 83 | Row backgrounds, subtle panels |
| `--c-gray-100` | `#f3f3f1` | 117 | Hover states, chip backgrounds, dividers |
| `--c-gray-200` | `#e5e5e2` | 87 | Borders, separators |
| `--c-gray-300` | `#d4d4d0` | 76 | Input borders, scrollbar thumb |
| `--c-gray-400` | `#6f6f6c` | 221 | Muted labels, placeholders, metadata (post-audit value — see below) |
| `--c-gray-500` | `#5f5f5c` | 109 | Secondary text, table header text (post-audit value — see below) |
| `--c-gray-600` | `#525250` | 60 | Body secondary text |
| `--c-gray-700` | `#3f3f3d` | 83 | Body text emphasis |
| `--c-gray-800` | `#292929` | 75 | Headings, strong text |
| `--c-gray-900` | `#171717` | 198 | Primary text |
| `--c-gray-950` | `#0a0a0a` | 0 | Defined but not yet referenced |

## Semantic tokens

| Token | Value | Usage count | Used in |
|---|---|---|---|
| `--c-accent` | `#3b82f6` | 3 | Focus ring selection, links (limited) |
| `--c-accent-hover` | `#2563eb` | 0 | Defined for hover variants |
| `--c-accent-light` | `#eff6ff` | 0 | Selection background (global) |
| `--c-accent-muted` | `#93c5fd` | 1 | Focus-visible outline |
| `--c-success` | `#22c55e` | 9 | Status pills, success indicators |
| `--c-warning` | `#eab308` | 2 | Status indicators |
| `--c-error` | `#ef4444` | 20 | Destructive actions, error states, validation |
| `--c-ai` | `#a78bfa` | 34 | AI-badged UI elements (AI insights, AI actions) |
| `--c-ai-bg` | `#f5f3ff` | 7 | AI panel backgrounds |

## Radii

| Token | Value | Notes |
|---|---|---|
| `--radius-sm` | `3px` | Small chips, compact buttons |
| `--radius-md` | `5px` | Default card/button radius |
| `--radius-lg` | `8px` | Larger cards, modals |
| `--radius-full` | `9999px` | Pills, scrollbar thumbs |

## Layout

| Token | Value | Notes |
|---|---|---|
| `--topbar-h` | `48px` | Global topbar height; layout offsets reference this |

## Global rules (from `globals.css`)

- `body` uses `color: var(--c-gray-900)` on `background: var(--c-white)`.
- Scrollbar thumb: `var(--c-gray-300)`, hover `var(--c-gray-400)`.
- `:focus-visible` outline: `2px solid var(--c-accent-muted)`, offset `1px`.
- `::selection`: background `var(--c-accent-light)`, color `var(--c-accent)`.

## WCAG AA contrast audit

Method: standard WCAG 2.1 relative-luminance formula. Threshold ≥4.5:1 for normal text, ≥3:1 for large text (18pt+/14pt bold) and non-text UI elements.

### Neutral text on light backgrounds

| Foreground | Background | Ratio | AA normal | AA large |
|---|---|---|---|---|
| gray-900 #171717 | white | 17.93 | PASS | PASS |
| gray-800 #292929 | white | 14.55 | PASS | PASS |
| gray-700 #3f3f3d | white | 10.55 | PASS | PASS |
| gray-600 #525250 | white | 7.83 | PASS | PASS |
| gray-500 #5f5f5c (post-fix) | white | 6.41 | PASS | PASS |
| gray-400 #6f6f6c (post-fix) | white | 5.04 | PASS | PASS |
| gray-300 #d4d4d0 | white | 1.49 | fail | fail (decorative only — borders/dividers) |
| gray-900 | gray-50 | 17.17 | PASS | PASS |
| gray-700 | gray-50 | 10.11 | PASS | PASS |
| gray-600 | gray-50 | 7.50 | PASS | PASS |
| gray-500 (post-fix) | gray-50 | 6.14 | PASS | PASS |
| gray-400 (post-fix) | gray-50 | 4.83 | PASS | PASS |
| gray-900 | gray-100 | 16.14 | PASS | PASS |
| gray-700 | gray-100 | 9.50 | PASS | PASS |
| gray-600 | gray-100 | 7.05 | PASS | PASS |
| gray-500 (post-fix) | gray-100 | 5.77 | PASS | PASS |
| gray-400 (post-fix) | gray-100 | 4.54 | PASS | PASS |

### Neutral text on dark backgrounds

| Foreground | Background | Ratio | AA normal | AA large |
|---|---|---|---|---|
| white | black #0a0a0a | 19.80 | PASS | PASS |
| gray-300 | black | 13.32 | PASS | PASS |
| gray-400 (post-fix) | black | 3.93 | fail | PASS (only used for hover/decorative on dark surfaces) |
| gray-500 (post-fix) | black | 3.30 | fail | PASS |
| `text-white/60` (Tailwind opacity) | black | 7.30 | PASS | PASS |
| `text-white/70` (Tailwind opacity) | black | 9.76 | PASS | PASS |

### Semantic colors

| Foreground | Background | Ratio | AA normal | AA large / UI |
|---|---|---|---|---|
| accent #3b82f6 | white | 3.68 | fail | PASS (large/UI — used for focus ring, not body text) |
| accent-hover #2563eb | white | 5.17 | PASS | PASS |
| accent #3b82f6 | gray-900 | 4.87 | PASS | PASS |
| success #22c55e | white | 2.28 | fail | fail (used for dot/fill indicators, not text) |
| warning #eab308 | white | 1.92 | fail | fail (decorative indicator only) |
| error #ef4444 | white | 3.76 | fail | PASS (large/UI — used for icons, borders, short labels) |
| ai #a78bfa | white | 2.72 | fail | fail (used as icon/accent color + background fill) |
| ai #a78bfa | ai-bg #f5f3ff | 2.48 | fail | fail (decorative pairing) |

### Known remaining failures (not fixed in this audit)

The following failures cannot be corrected without modifying `.tsx` files, which is out of scope for this CSS-only audit. They are tracked for a follow-up component pass:

1. `text-white/40` on `var(--c-black)` — 3.77 ratio. Used for labels in `/project/[id]`, `/new`, and `/collection/[token]/presentation`. Fails AA normal (passes large). Fix: raise to `text-white/60` in component files.
2. `--c-success`, `--c-warning`, `--c-ai` used as text on white — fail AA. These are acceptable as decorative indicators (dots, icon fills, background tints) but must not be used as the sole carrier of information for body text. Follow-up: audit components that render these as text and darken the token or switch to `gray-800`/`gray-900` for accompanying labels.
3. `--c-accent` on white for large text/icons only (3.68 — passes large / UI). If ever used for body copy, switch to `--c-accent-hover` (5.17, AA PASS).

### CSS changes applied by this audit

Only `src/app/globals.css` was modified:

- `--c-gray-400`: `#a3a3a0` → `#6f6f6c`. Before: 2.53:1 on white (fail AA normal). After: 5.04:1 (PASS AA normal). This token is used 221 times across the codebase — predominantly for body-size metadata text — so lifting it to AA is the highest-impact fix.
- `--c-gray-500`: `#737370` → `#5f5f5c`. Before: 4.76:1 on white (PASS) but 4.28:1 on gray-100 (fail AA normal, used in chip labels and table header cells). After: 6.41:1 on white, 5.77:1 on gray-100 (both PASS). Darkened in step with gray-400 to preserve visual scale separation.

All other tokens are unchanged.
