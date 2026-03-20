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

### ✅ Phase 1 — Complete
- **1A** Auth & Roles: Login page, auth hook, middleware, profiles table, RLS
- **1B** Project Status: draft/internal/public column with filter + edit support
- **1C** Smart Search: Result count hint when filters are active
- **1D** Activity Log: activity_log table, logActivity helper, feed page

### ✅ Phase 2 — Complete
- **2A** Related Projects: Similarity-scored related projects on project detail
- **2B** Timeline: Horizontal scrollable timeline visualization
- **2C** Collections: Full CRUD collections with picker modal in bulk actions
- **2D** Map: MapLibre GL map with B&W CARTO tiles, clustered location markers

### 🔲 Phase 3 — Shelved (awaiting user input)
- **3A** Engagements DB — shelved, needs more exploration
- **3B** Dashboard — shelved, needs more exploration
- **3C** Client View & Capability Matrix — shelved, needs more exploration

### 🔲 Phase 4 — Next Up
- **4A** Public Portfolio
- **4B** Shareable Project Links
- **4C** Shared Collection Links

### 🔲 Phase 5
- **5A** AI Case Study Writer (Claude Sonnet)
- **5B** Multi-Language (EN/IT)
- **5C** PPTX Export

### 🔲 Phase 6
- **6A** Automated Backups
- **6B** Video Thumbnails
- **6C** Asset Tagging

### SQL Migrations Applied
- `002_auth_and_profiles.sql` — profiles, trigger, RLS
- `003_project_status.sql` — status column
- `004_activity_log.sql` — activity_log table
- `005_collections.sql` — collections + collection_items
- `006_project_location.sql` — location_name, latitude, longitude
