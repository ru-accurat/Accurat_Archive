# Accurat Archive Web — Technical Architecture Reference

## 1. What This Application Is

Accurat Archive is an internal portfolio management system for Accurat, a data-driven design studio. It catalogues ~200 projects with rich metadata, media galleries, case study prose, and business engagement records. The app serves three audiences:

- **Internal team** (editors/admins): manage the full project archive, write case studies, track engagements, curate collections
- **External stakeholders** (via share links): view individual projects or curated collections through public URLs
- **Public visitors** (via portfolio): browse published projects on a public-facing portfolio page

Production URL: `https://accurat-archive.vercel.app/`

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.7 |
| UI | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4 |
| State | Zustand | 5.0.12 |
| Database | Supabase PostgreSQL | Pro plan |
| Storage | Supabase Storage | 3 buckets |
| AI | Anthropic SDK (Claude Sonnet 4) | 0.79.0 |
| Maps | MapLibre GL | 5.21.0 |
| Drag & Drop | @dnd-kit | 6.3 / 10.0 |
| Image Processing | Sharp | 0.34.5 |
| CSV | PapaParse | 5.5.3 |
| ZIP | Archiver | 7.0.1 |
| Spreadsheet Export | xlsx | 0.18.5 |
| Deployment | Vercel | Pro plan |

---

## 3. Project Structure

```
accurat-archive-web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (app)/                    # Authenticated routes (requires login)
│   │   │   ├── page.tsx              # Projects index — table or grid view
│   │   │   ├── project/[id]/page.tsx # Project detail — view & edit mode
│   │   │   ├── collections/page.tsx  # Collections management
│   │   │   ├── timeline/page.tsx     # Gantt-style timeline
│   │   │   ├── map/page.tsx          # Geographic map view
│   │   │   ├── tags/page.tsx         # Tag taxonomy management
│   │   │   ├── activity/page.tsx     # Activity audit log
│   │   │   ├── settings/page.tsx     # User & AI settings
│   │   │   └── engagements/page.tsx  # Business engagement records
│   │   ├── (public)/                 # Public-facing (no login)
│   │   │   ├── portfolio/            # Public project listing
│   │   │   ├── portfolio/[slug]/     # Public project detail
│   │   │   ├── share/[token]/        # Shareable single-project link
│   │   │   └── collection/[token]/   # Shareable collection link
│   │   ├── (auth)/                   # Login / auth pages
│   │   ├── api/                      # API routes (see Section 7)
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # CSS variables, resets, base styles
│   ├── components/
│   │   ├── layout/                   # AppShell, navigation, sidebar
│   │   ├── project/                  # View-mode project detail components
│   │   ├── edit/                     # Edit-mode components (inline editing)
│   │   ├── index/                    # Homepage: table, grid, filters, bulk actions
│   │   ├── shared/                   # Reusable: modals, popovers, pickers
│   │   └── import/                   # CSV/data import UI
│   ├── hooks/
│   │   ├── use-projects.ts           # Load all projects from API
│   │   ├── use-filters.ts            # Client-side filter engine
│   │   ├── use-project-detail.ts     # Single project + media fetching
│   │   ├── use-auth.ts               # Auth session + user profile
│   │   ├── use-keyboard-nav.ts       # Arrow key table navigation
│   │   ├── use-keyboard-shortcuts.ts # Global keyboard shortcuts
│   │   └── use-shared-filters.ts     # Shared filter state across views
│   ├── stores/
│   │   ├── project-store.ts          # Zustand: projects[], filters, sort, selection
│   │   └── ui-store.ts               # Zustand: viewMode (table/grid), editMode
│   ├── lib/
│   │   ├── types.ts                  # All TypeScript interfaces
│   │   ├── api-client.ts             # Single API surface (~40 methods)
│   │   ├── db-utils.ts               # rowToProject() / projectToRow() mappers
│   │   ├── supabase.ts               # Supabase client factories
│   │   ├── supabase-middleware.ts     # Auth middleware helper
│   │   ├── supabase-server.ts        # Server-side auth utilities
│   │   ├── completeness.ts           # Project completeness scoring
│   │   ├── similarity.ts             # Related-projects scoring (Levenshtein)
│   │   ├── activity.ts               # Activity log helper
│   │   ├── slug.ts                   # URL slug generation
│   │   ├── format.ts                 # Date/number formatting
│   │   ├── media-url.ts              # Supabase storage URL builder
│   │   ├── media-types.ts            # File type detection
│   │   └── client-matching.ts        # Fuzzy client name matching
│   ├── middleware.ts                  # Next.js request middleware (auth check)
│   └── scripts/                      # Build-time data scripts
├── supabase/
│   └── migrations/                   # 10 sequential SQL migrations (001–010)
├── public/                           # Static assets
├── CLAUDE.md                         # Developer reference (kept in sync)
├── package.json
├── tsconfig.json
├── next.config.ts
├── vercel.json                       # maxDuration: 120 for image processing
└── .env.local                        # Environment variables
```

---

## 4. Data Architecture

### 4.1 Core Data Model: `Project`

The `projects` table is the heart of the application. Key fields:

| Field Group | Fields | Notes |
|-------------|--------|-------|
| **Identity** | `id`, `full_name`, `client`, `project_name` | `id` auto-generated as `client-projectName` slug |
| **Classification** | `tier` (1-3), `section` (studio unit), `output` (category), `status` (draft/internal/public) | Tier 1 = featured |
| **Time** | `start_year`, `end_year` | Both integers, end_year nullable |
| **Taxonomy** | `domains[]`, `services[]` | Text arrays; managed in Tags page |
| **Case Study** | `tagline`, `description`, `challenge`, `solution`, `deliverables`, `client_quotes` | Long text; scored for completeness |
| **People & Links** | `team[]`, `urls[]` | Text arrays |
| **Media** | `folder_name`, `media_order[]`, `hero_image`, `thumb_image`, `client_logo` | Filenames referencing Supabase Storage |
| **AI** | `ai_generated[]` | Tracks which fields were AI-written |
| **Location** | `location_name`, `latitude`, `longitude` | For map view |
| **Sharing** | `share_token` | Unique token for public share links |
| **Timestamps** | `created_at`, `updated_at` | Auto-managed |

### 4.2 Supporting Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `project_history` | Snapshot JSONB of full project state on each update | FK to `projects` |
| `clients` | Canonical client records with aliases | Referenced by `engagements` |
| `engagements` | Financial records (year, amounts EUR/USD) | FK to `clients`, linked to projects via `engagement_projects` |
| `engagement_projects` | M2M join: engagements ↔ projects | Composite PK |
| `collections` | Named, ordered groups of projects | Has share_token |
| `collection_items` | Projects in a collection with position ordering | FK to `collections` + `projects` |
| `activity_log` | Audit trail (action, details JSONB) | FK to `projects` (nullable) |
| `import_batches` | Tracks CSV imports for undo | Referenced by `engagements` |
| `config` | Key-value store for app settings | Used for AI settings |

### 4.3 Storage Buckets (Supabase)

| Bucket | Contents | Access |
|--------|----------|--------|
| `project-media` | Images, videos, GIFs per project folder | Public |
| `logos` | Client logo images | Public |
| `project-pdfs` | PDF documents per project | Public |

### 4.4 DB ↔ Frontend Mapping

All data passes through bidirectional mappers:
- `rowToProject()` — converts snake_case DB rows to camelCase TypeScript `Project` objects
- `projectToRow()` — converts camelCase back to snake_case for DB writes

Both live in `src/lib/db-utils.ts`. This is a hard architectural rule: never access DB fields directly in components.

---

## 5. Application Architecture

### 5.1 Data Flow

```
Browser → React Components → Zustand Store → api-client.ts → Next.js API Routes → Supabase
                                                                      ↓
                                                            rowToProject() mapping
                                                                      ↓
                                                              Zustand Store update
                                                                      ↓
                                                              React re-render
```

### 5.2 State Management (Zustand)

**`project-store.ts`** — central data store:
- `projects[]` — all loaded projects
- `filters` — active search/facet/completeness filters
- `sort` — column + direction
- `selectedIds` — multi-selection set
- Actions: `setProjects`, `updateProject`, `removeProject`, `setFilters`, `toggleSelection`

**`ui-store.ts`** — UI preferences:
- `viewMode` — `'table'` or `'grid'`
- `editMode` — boolean
- `sidebarCollapsed` — boolean

### 5.3 Filter Engine

All filtering is client-side for instant response. The engine (in `use-filters.ts`) applies:

1. **Text search** — matches across: client, projectName, description, tagline, output, team, domains, services
2. **Faceted filters** — multi-select on: domains, services, output, section, tier, status
3. **Year range** — min/max year
4. **Completeness filters** — "Missing Description", "Missing Media"

Filter options are dynamically derived from the current dataset.

### 5.4 Completeness Scoring

10 fields are scored (`src/lib/completeness.ts`):
- tagline, description, challenge, solution, deliverables, clientQuotes, team, urls, domains, services
- Score = (filled fields / 10) * 100
- Projects display a percentage indicator; can filter by missing fields

### 5.5 Similarity Scoring (Related Projects)

`src/lib/similarity.ts` scores project similarity:
- Same client: +4 points
- Each shared domain: +3 points
- Each shared service: +2 points
- Same output category: +1 point
- Same section: +1 point
- Returns top matches sorted by score

### 5.6 Authentication

- Supabase Auth with cookie-based sessions
- `src/middleware.ts` protects all `(app)/` routes
- User profiles table with roles: `admin`, `editor`, `viewer`
- `use-auth.ts` hook provides current user + profile
- API routes use service role key (no per-user auth on API layer yet)

---

## 6. Key Components

### 6.1 Homepage (`(app)/page.tsx`)

Two view modes toggled from the toolbar:

- **Table View** (`ProjectTable.tsx`) — sortable columns: client, project, unit, tier, year, category, completeness. Supports keyboard navigation (arrow keys), multi-select with checkboxes, inline edit cells
- **Grid View** (`ProjectGrid.tsx`) — card-based gallery with hero images

Shared features:
- `FilterBar.tsx` / `FilterAccordion.tsx` — faceted search sidebar
- `BulkActions.tsx` — actions on selected projects (add to collection, export CSV/ZIP, bulk edit)
- `Sidebar.tsx` — navigation panel

### 6.2 Project Detail (`project/[id]/page.tsx`)

Toggle between view and edit mode:

**View mode components** (`components/project/`):
- `HeroSection.tsx` — full-width hero image
- `GalleryGrid.tsx` — ordered media gallery (images, videos, GIFs)
- `MetadataBar.tsx` — tier, section, year, status badges
- `TextBlock.tsx` — case study prose sections
- `TagChips.tsx` — domain/service tags
- `TeamList.tsx` — team member list
- `UrlLinks.tsx` — project URLs
- `RelatedProjects.tsx` — similarity-scored recommendations
- `LinkedEngagements.tsx` — associated financial records

**Edit mode components** (`components/edit/`):
- `EditableField.tsx` — inline text/textarea editing
- `EditableTagsField.tsx` — tag editing with autocomplete
- `EditableUrlsField.tsx` — URL list editing
- `EditableMetadata.tsx` — dropdowns for tier, section, status, year
- `MediaManager.tsx` — drag-and-drop media reordering, upload, hero/thumb selection
- `HistoryPanel.tsx` — view/restore previous versions
- `AiDiffModal.tsx` — before/after diff for AI-generated content
- `CaseStudyWriter.tsx` — AI-powered case study generation
- `ChecklistTagField.tsx` — checklist-style tag picker

### 6.3 Specialized Views

- **Timeline** (`timeline/page.tsx`) — horizontal Gantt-style bars by year, colored by studio unit
- **Map** (`map/page.tsx`) — MapLibre GL with CARTO B&W tiles, clustered markers for geolocated projects
- **Collections** (`collections/page.tsx`) — create/manage curated project groups with drag-drop ordering
- **Tags** (`tags/page.tsx`) — manage taxonomy (rename, merge tags across all projects)
- **Activity** (`activity/page.tsx`) — chronological feed of all changes (created, updated, deleted)
- **Engagements** (`engagements/page.tsx`) — financial records with CSV import, client linking
- **Settings** (`settings/page.tsx`) — user profile, AI API key config

### 6.4 Public Pages

- **Portfolio listing** (`portfolio/page.tsx`) — browse all `status="public"` projects
- **Portfolio detail** (`portfolio/[slug]/page.tsx`) — full project view for public projects
- **Share link** (`share/[token]/page.tsx`) — view any project via unique token
- **Collection link** (`collection/[token]/page.tsx`) — view curated collection via token

---

## 7. API Routes

All routes live under `src/app/api/`. They use `createServiceClient()` (Supabase service role key).

### Projects
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Get single project |
| PATCH | `/api/projects/[id]` | Update project (saves history snapshot first) |
| DELETE | `/api/projects/[id]` | Delete project + media |
| GET | `/api/projects/[id]/history` | List history snapshots |
| GET | `/api/projects/[id]/related` | Get similarity-scored related projects |

### Media
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects/[id]/media` | List media files |
| POST | `/api/projects/[id]/media/upload-urls` | Generate signed upload URLs |
| DELETE | `/api/projects/[id]/media/[filename]` | Delete single file |
| POST | `/api/projects/[id]/media/batch-delete` | Delete multiple files |
| POST | `/api/projects/[id]/media/reorder` | Update media_order array |
| POST | `/api/projects/[id]/media/finalize` | Convert images (HEIC/AVIF to WebP via Sharp) |
| GET | `/api/projects/media/special` | Get hero/thumb/first images for all projects (cached) |

### PDFs & Logos
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST/DELETE | `/api/projects/[id]/pdfs/*` | PDF management |
| GET/POST/DELETE | `/api/projects/[id]/logo` | Client logo management |

### Collections
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/collections` | List / create collections |
| GET/PATCH/DELETE | `/api/collections/[id]` | Collection CRUD |
| GET/POST | `/api/collections/[id]/items` | Manage items in collection |
| GET/POST | `/api/collections/[id]/share-token` | Generate/get share token |

### Tags
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tags` | Get all unique tags |
| POST | `/api/tags/rename` | Rename tag across all projects |
| POST | `/api/tags/merge` | Merge two tags into one |

### Engagements & Clients
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/engagements` | List / create engagements |
| PATCH/DELETE | `/api/engagements/[id]` | Update / delete |
| POST/DELETE | `/api/engagements/[id]/link` | Link/unlink to projects |
| POST | `/api/engagements/import/parse` | Parse CSV for import |
| POST | `/api/engagements/import/apply` | Apply import batch |
| GET | `/api/engagements/import/batches` | List import batches |
| DELETE | `/api/engagements/import/[batchId]` | Undo import batch |
| GET | `/api/clients` | List all clients |
| GET/PATCH | `/api/clients/[id]` | Client detail / update |
| POST | `/api/clients/merge` | Merge duplicate clients |

### AI
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/ai/generate` | Generate content with Claude Sonnet |
| GET/PATCH | `/api/ai/settings` | AI configuration |

### Public
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/public/portfolio` | List public projects |
| GET | `/api/public/portfolio/[slug]` | Public project detail |
| GET | `/api/public/share/[token]` | Get project by share token |
| GET | `/api/public/collection/[token]` | Get collection by share token |

### Export
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/csv/export` | Export projects as CSV |
| POST | `/api/csv/parse` | Parse CSV for import preview |
| POST | `/api/csv/apply` | Apply CSV import |
| POST | `/api/zip/export` | Export projects + media as ZIP |

---

## 8. CSS & Styling System

### Custom Properties (defined in `globals.css`)
```css
--c-white, --c-black
--c-gray-50 through --c-gray-900
--c-accent, --c-accent-muted, --c-success
--radius-sm, --radius-md, --radius-lg
--shadow-sm, --shadow-md
--topbar-h                              /* fixed header height */
```

### Conventions
- Responsive padding: always `px-4 sm:px-6 md:px-[48px]`
- Pixel-precise values: use `mb-[12px]` not `mb-3` (Tailwind v4 quirk)
- Global reset in `@layer base` to avoid specificity conflicts
- No UI component library — all components are custom-built

---

## 9. Known Gotchas

1. `<select>` elements need `bg-white cursor-pointer` and parent `relative z-10` in Chrome
2. `EditableMetadata.tsx` MUST have `'use client'` directive
3. After media upload/delete, call `refreshMedia()` — never `window.location.reload()`
4. Image conversion (HEIC/AVIF to WebP) happens in the finalize API route via Sharp. Vercel function timeout set to 120s
5. Tailwind v4 arbitrary values: prefer `mb-[12px]` over `mb-3` for pixel precision
6. All DB reads/writes go through `rowToProject()`/`projectToRow()` — never access raw DB columns in components

---

## 10. Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side API routes) |
| `ANTHROPIC_API_KEY` | Claude API key for AI generation |

---

## 11. Development Roadmap

**Last reconciled:** 2026-04-21 (original phase plan replaced after mid-April band sprint).

### Shipped

- **Phase 1** — Auth & Roles, Project Status, Search, Activity Log.
- **Phase 2** — Related Projects, Timeline, Collections, Map.
- **Phase 3** (previously labeled shelved; built during the Bands B/C sprint):
  - Engagements system (clients, engagements, linking, CSV import with undo).
  - Client Intelligence Dashboard (C3).
  - Capability Inventory dashboard (C1/C2).
  - Team Contribution view (C4).
- **Phase 4** — Public portfolio, shareable project links, shared collection links.
- **Phase 5A** — AI Case Study Writer with draft persistence and draft/published versioning.
- **Phase 5C** — PPTX Pitch Deck Generator with per-project image picker.

### Shipped beyond the original plan (Bands A/B/C sprint)

Onboarding (command palette + product tour, B4) · Needs-attention dashboard (B2) · Audit surfacing / last-edited badge / activity feed (B7) · Skeleton loading states (B6) · Design system docs + WCAG AA fixes (B5) · Role-based access with `content_reader` role · Multi-client projects (`client_2` + `agency`) · AI auto-tag suggestions (C6) · AI Collection Builder · AI-inferred project location.

The band structure is retired.

### Active work

None. Codebase review planned; roadmap will be revisited after.

### Backlog (no commitment, no ordering)

- **Semantic search via pgvector** — the only major item from `UX-RESEARCH-AND-ROADMAP.md` §3.1 that never shipped. Use Claude/OpenAI embeddings, store in Supabase pgvector. Enables semantic discovery, "more like this," question-answering.
- **Automated backups** — scheduled off-platform export of projects + media.
- **Video thumbnails** — auto-generate poster frames so video tiles don't render black.
- **Asset tagging** — per-media tagging beyond the project-level taxonomy.

### Dropped

- **Multi-language (EN/IT)** — previously listed as Phase 5B. Explicitly dropped 2026-04-21. Do not resurface without explicit re-scoping.

### SQL Migrations Applied (001–019)

001 initial schema · 002 auth & profiles · 003 project status · 004 activity log · 005 collections · 006 project location · 007 project share token · 008 clients & engagements · 009 AI settings · 010 collection enhancements / collection groups · 012 filter presets · 013 case study drafts · 014 collection templates · 015 collection views · 016 published version (draft/published split) · 017 client2 + agency · 018 split combined clients · 019 add content_reader role.

(Migration 011 was skipped or renumbered — worth verifying if migration sequencing matters for a clean re-import.)
