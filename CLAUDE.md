# Accurat Archive Web

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

## Integration Plan
See `.claude/plans/golden-jumping-balloon.md` for the 6-phase feature integration plan:
Phase 1: Auth & Roles, Status Workflow, Activity Log
Phase 2: Related Projects, Timeline, Collections, Map
Phase 3: Engagements DB, Dashboard, Client Views, Capability Matrix
Phase 4: AI Case Study Writer, Multi-Language (EN/IT), PPTX Export
Phase 5: Public Portfolio, Shareable Links
Phase 6: Backups, Video Thumbnails, Asset Tagging
