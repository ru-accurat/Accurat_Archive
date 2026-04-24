# Accurat Archive Web

## Second Brain

This project's living knowledge layer is maintained in Gabriele's Second Brain vault at
`~/Desktop/Claude/Claude_Projects/Second Brain/`. The canonical project entry is
`01 - Projects/Accurat Archive/README.md` and the broader context lives in
`02 - Areas/Accurat/README.md`, `05 - Notes/Accurat Voice Guide.md`, `Accurat Market View.md`,
`Accurat Company Profile.md`, `Accurat Case Study Writing Guidelines.md`, `Accurat Case Study Examples.md`.

**Protocol:** read the vault entry at the start of structural work. When material decisions,
conventions, or lessons emerge in a session, propose an update to the vault before the session ends.

## Project Overview
Next.js 16 portfolio/archive app for Accurat studio. ~200 projects stored in Supabase PostgreSQL.
Deployed on Vercel Pro at https://accurat-archive.vercel.app/

## Tech Stack
- Next.js 16.1.7 (App Router), React 19, TypeScript
- Supabase: PostgreSQL + Storage (buckets: project-media, logos, project-pdfs)
- Zustand 5 (state), Tailwind CSS 4, @dnd-kit (drag-and-drop)
- Anthropic AI SDK (Claude Sonnet for content generation)
- Sharp (image conversion), PapaParse (CSV), Archiver (ZIP), pptxgenjs (planned)

## Key Architecture
- DB mapping: `rowToProject()`/`projectToRow()` in `src/lib/db-utils.ts` convert between snake_case DB and camelCase frontend
- All API routes use `createServiceClient()` from `src/lib/supabase.ts` (service role key, no auth yet)
- `src/lib/api-client.ts` is the single client-side API surface (~30 methods)
- Stores: `project-store.ts` (projects, filters, sort, selection), `ui-store.ts` (viewMode, editMode)
- Filter logic in `src/hooks/use-filters.ts` — search + facet filters applied client-side

## Development
- `npm run dev` starts on port 3000 (or 3001 if 3000 is taken)
- Dev server: `cd accurat-archive-web && npx next dev --port 3001`
- Build check: `npx next build`
- Push: `git push` (main branch, direct push)

## Code Conventions
- CSS: Use CSS custom properties (`--c-gray-*`, `--radius-*`, `--shadow-*`) defined in globals.css
- Responsive padding: `px-4 sm:px-6 md:px-[48px]` — never use fixed `px-[48px]` alone
- Tailwind v4: Global `* { margin: 0 }` is wrapped in `@layer base` to avoid specificity conflicts
- Arbitrary values: Use `mb-[12px]` not `mb-3` when exact pixel values matter (Tailwind v4 quirk)
- Components: `src/components/edit/` (edit mode), `src/components/project/` (view mode), `src/components/index/` (homepage)
- File inputs: Hidden `<input ref={ref}>` triggered by button click handlers

## Gotchas
- `select` elements need explicit `bg-white cursor-pointer` class and parent `relative z-10` to work in Chrome
- `EditableMetadata.tsx` must have `'use client'` directive — without it, selects don't respond to interaction
- After media upload/delete, use `refreshMedia()` from `useProjectDetail` hook — never `window.location.reload()`
- Image conversion (HEIC/AVIF → WebP) happens server-side in finalize route via Sharp. Set `maxDuration: 120` in vercel.json
- The `(app)` route group wraps all authenticated pages. `(auth)` and `(public)` groups are planned for Phase 1/5

## Supabase
- Project: Supabase Pro plan
- Tables: `projects`, `project_history`, `config`
- Storage buckets: `project-media` (public), `logos` (public), `project-pdfs` (public)
- No RLS currently — all access via service role key
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Docs

The full spec lives in `docs/` — read those before this file for anything beyond quick reference:

- **`docs/ARCHITECTURE.md`** — primary tech reference (stack, routing, data model, state, API surface, CSS, gotchas).
- **`docs/DESIGN-SYSTEM.md`** — design tokens, semantic colors, WCAG AA.
- **`docs/USER-GUIDE.md`** — end-user documentation.
- **`docs/UX-RESEARCH-AND-ROADMAP.md`** — UX analysis that drove the Bands A/B/C sprint (mostly shipped).
- **`docs/phase-3-engagements-plan.md`** — plan for the Engagements system (shipped).

## Current state (as of 2026-04-21)

The original Phase 1–6 plan is obsolete. Reconciled roadmap:

**Shipped (former phases):**
- **Phase 1** — Auth & Roles, Project Status, Search, Activity Log.
- **Phase 2** — Related Projects, Timeline, Collections, Map.
- **Phase 3** (was shelved, got built) — Engagements, Client Intelligence Dashboard (C3), Capability Inventory (C1/C2), Team Contribution (C4).
- **Phase 4** — Public Portfolio (`(public)/portfolio`), Shareable Project Links (share tokens), Shared Collection Links.
- **Phase 5A** — AI Case Study Writer with draft persistence and versioning (draft/published separation).
- **Phase 5C** — PPTX Pitch Deck Generator.

**Shipped beyond the original plan (Bands A/B/C sprint, Mar–Apr 2026):**

| Band | Feature |
|---|---|
| A | Client matching, CSV import, collection polish |
| B1 | Pitch Deck generator (PPTX) |
| B2 | `/needs-attention` dashboard |
| B3 | Engagement linking (import suggestions, batch linker, unlinked revenue) |
| B4 | Onboarding (command palette + product tour) |
| B5 | Design system docs + WCAG AA gray scale fix |
| B6 | Standardized skeleton loading states |
| B7 | History/audit surfacing (last-edited badge + activity feed) |
| C2 | Capability inventory dashboard |
| C3 | Client intelligence dashboard |
| C4 | Team contribution view |
| C5 | Versioned case studies (draft/published) |
| C6 | Auto-tag suggestions from description content |

The band structure is retired as of 2026-04-21.

**Active work:** None. Codebase review planned; roadmap will be revisited after.

**Backlog (no commitment, no ordering):**
- **Semantic search (pgvector)** — the only major UX research item that never shipped. Enables semantic discovery, "more like this," question-answering over the archive.
- **Automated backups** — scheduled off-platform export of projects + media.
- **Video thumbnails** — auto-generate poster frames for video media.
- **Asset tagging** — per-media tagging beyond project-level taxonomy.

**Dropped:** Multi-language (EN/IT). Do not resurface without explicit re-scoping.

## SQL Migrations Applied (001–019)

001 initial · 002 auth & profiles · 003 project status · 004 activity log · 005 collections · 006 project location · 007 share tokens · 008 clients & engagements · 009 AI settings · 010 collection enhancements / collection groups · 012 filter presets · 013 case study drafts · 014 collection templates · 015 collection views · 016 published version (draft/published) · 017 client2 + agency · 018 split combined clients · 019 add content_reader role

(Migration 011 was skipped or renumbered — worth verifying if migration ordering matters for a future clean import.)
