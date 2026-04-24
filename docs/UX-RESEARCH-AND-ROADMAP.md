# UX Research Analysis & Product Roadmap — Accurat Archive

Based on extensive work on this codebase, this document presents a structured analysis from a UX research perspective, grounded in the app's architecture, user flows, and the design studio context it serves.

---

> **Status as of 2026-04-21.** This document was written to drive a focused development sprint (Bands A/B/C). Most of it shipped. See the **Priority Recommendations** table at the bottom for the crisp status on the top 5 items; markers (✅ / ⏸ / 🔲) have also been added inline to the detailed sections below.
>
> This doc now reads as a historical record of the research → sprint pipeline, not a live roadmap. The current roadmap is maintained in `CLAUDE.md` and `ARCHITECTURE.md §11`.

---

## Part 1: Refactoring Opportunities (Code + UX)

### 1.1 The Project Detail Page is a 600-line "god component" ✅ shipped

> Refactor complete as of 2026-04-21. `src/components/project/` now contains 18 sub-components including `ProjectMediaSection`, `ProjectAIBar`, `ProjectSidebar`, `ProjectHero`, `ProjectTagsSection`, `ProjectLinksSection`, `ProjectDescriptions`, `ProjectMetadata` — matching the recommended decomposition. Field-level editing shipped as `src/components/edit/InlineEditableField.tsx` + `InlineEditableArray.tsx`. `page.tsx` is still ~610 lines but is now an orchestrator composing sub-components rather than a monolith.

**Current state:** `src/app/(app)/project/[id]/page.tsx` handles view mode, edit mode, media upload, AI generation, PDF management, history, keyboard navigation, and more — all in one file.

**UX impact:**
- When users click "Edit", the screen transforms entirely (dark → light, breadcrumb shifts, layout changes). It's disorienting — feels like navigating to a different page but the URL stays the same.
- Edit and view modes duplicate rendering logic, making it easy for the two to drift out of sync (e.g., a field shows in view mode but not in edit mode).
- Save is all-or-nothing: you can't "save draft" without losing other in-progress edits.

**Recommendation:**
- **Split into sub-components**: `ProjectDetailView`, `ProjectDetailEdit`, `ProjectMediaSection`, `ProjectAISection`. Each under 200 lines.
- **Introduce "field-level editing"**: instead of a global edit mode, each field becomes click-to-edit (like the client page already does for name). Users can edit one field, save, edit another. Lower cognitive load, no "am I in edit mode or not?" confusion.
- **Keep the "Edit All" mode** as a secondary path for bulk edits — but make single-field editing the primary interaction.

### 1.2 Filter system is powerful but buried ✅ mostly shipped

> URL-sync filters ✅ (`src/hooks/use-url-filters.ts`). Saved filter presets ✅ (migration 012). Default filter badge + `Esc` to clear — status less clear, worth a quick UX pass.

**Current state:** The filter accordion collapses/expands. New users don't discover filters exist.

**UX impact:**
- Active filters are shown as chips, but the default "Internal + Public" status filter isn't visually obvious — users think they're seeing all projects when they're not.
- No way to save filter combinations (e.g., "Tech unit projects from last 2 years with media")
- Filter/sort choices don't persist in the URL → refreshing loses state, sharing a filtered view requires a screenshot.

**Recommendations:**
1. **URL-sync filters** via `useSearchParams` — every filter change updates the URL so users can share specific views: `/?domains=finance&status=public`. Low-effort, high-impact.
2. **Default filter badge**: if draft projects are hidden, show "Showing 214 of 287 — draft projects hidden" prominently, not just as a subtle chip.
3. **Saved filter presets**: let users create named presets ("My pitch-ready projects", "Everything from 2024"). Stored per-user in Supabase.
4. **Keyboard shortcut to clear all filters**: `Esc` when a filter is active.

### 1.3 Search is invisible and not progressive ⏸ partial

> Fuzzy search via Fuse.js ✅ shipped. Match-source indicator / highlighting / Supabase full-text search — not shipped. Semantic search (pgvector) is in the backlog, see §3.1.

**Current state:** Search filters the list but there's no indication of *why* a project matched. If you search "climate", you don't know if it's in the description, tags, or client name.

**UX impact:**
- Users doubt whether the search is actually working when results seem unrelated.
- No "recent searches" or "search suggestions".
- Search is purely substring matching — no typo tolerance, no synonyms (e.g., "UX" won't find "user experience").

**Recommendations:**
1. **Highlighting**: when a search is active, highlight the matching term in the card (client name, project name, tagline).
2. **Match source indicator**: small chip showing "matched: description" or "matched: tag".
3. **Fuzzy search** via Fuse.js (~10KB) for typo tolerance.
4. **Supabase full-text search** (Postgres `ts_vector`) for content-heavy search — moves search to the server, enables ranking.

### 1.4 The "Missing Media / Description" filter is the most-used but least accessible ✅ shipped (B2)

> `/needs-attention` dashboard shipped with drafts ready to publish, incomplete projects, missing media views. Inline "publish" action also shipped.

**Current state:** The missing filter is one of many inside the accordion. Status is a separate filter. There's no "Show me what needs attention" quick view.

**Recommendations:**
1. **Attention dashboard**: a dedicated view at `/drafts` or `/needs-attention` showing:
   - Projects with no description, grouped by client
   - Projects with <3 media files
   - Projects marked draft but otherwise complete (ready to publish)
   - Projects with completeness <50%
2. **Inline "publish" action**: when a project is draft + complete, surface a "Ready to publish?" prompt right on the project card.

### 1.5 Case Study Writer is powerful but modal-locked ⏸ partial

> Drafts persistence ✅ shipped (migration 013 `case_study_drafts` + versioning in migration 016). Side-drawer conversion and "reference project" picker — not shipped.

**Current state:** The writer is a modal over the project detail page. Users can't reference other projects while writing.

**UX impact:**
- Can't open another project in a tab to compare tone/structure.
- Long Italian notes + diff view + generated fields all compete for modal space.
- Can't come back to a half-written case study later — must restart.

**Recommendations:**
1. **Convert the Writer to a side drawer** (50-60% width) instead of a modal, so the project's media/metadata remains visible.
2. **Drafts persistence**: save generation attempts to a `case_study_drafts` table. Users can return to them, compare, pick the best.
3. **"Reference project" picker**: when refining, let the user explicitly say "write this like the IBM Watson case study" — the AI loads that project's description as a style anchor.

### 1.6 The Engagements ↔ Projects linking is manual and one-directional ✅ shipped (B3)

> Fuzzy auto-match on import, bi-directional batch linker, and unlinked-revenue warnings all shipped.

**Current state:** You can link from engagements to projects but suggestion algorithms are basic.

**Recommendations:**
1. **Fuzzy auto-match on import**: when importing XLSX, auto-suggest links based on client + year + project name similarity. User confirms in bulk.
2. **Bi-directional batch linker**: "Show me all engagements for IBM that don't have a linked project yet" — batch-link them from a single view.
3. **Unlinked revenue warning**: on the engagements dashboard, show "€X of revenue is not linked to any case study" as a call to action.

### 1.7 Collections lack hierarchy ✅ mostly shipped

> Collection groups ✅ (migration 010). Collection templates ✅ (migration 014). Presentation mode ✅ (`(public)/collection/[token]/presentation/`). Collection analytics — not shipped.

**Current state:** Collections are flat. Groups provide one level of subdivision. Share links exist but there's no "pitch deck mode".

**Recommendations:**
1. **Presentation mode**: a shared collection viewed in `?view=presentation` renders full-screen, one project per "slide", with arrow key navigation. Great for live pitches.
2. **Collection templates**: "New client pitch", "Capability overview", "Annual report" — pre-filled collections with suggested groups.
3. **Collection analytics**: for shared collections, track views and time spent per project. Which case studies are engaging prospects?

---

## Part 2: Overall Improvements

### 2.1 Onboarding is nonexistent ✅ shipped (B4)

> Interactive product tour + ⌘K command palette both shipped (`cmdk` dep, `src/components/onboarding/`).

There's no first-run experience. New team members joining Accurat would have to learn the app by exploring. The nav is dense (9+ items) and unfamiliar.

**Recommendations:**
1. **Interactive product tour** on first login (5-6 steps max): "This is how you find projects / edit them / create collections / share work".
2. **Empty states with action prompts**: already done on some pages but not consistently. Every "no X yet" should suggest what to do next.
3. **`/help` or `⌘K` command palette**: searchable list of all actions ("Create project", "Import CSV", "Generate in-use image") with keyboard shortcuts shown.

### 2.2 Mobile experience is likely poor 🔲 open

> Not specifically addressed during the sprint. Worth revisiting in the upcoming codebase review.

The codebase has `sm:` and `md:` breakpoints but the primary design target is clearly desktop. Many views (table, timeline, map) don't work well on mobile.

**Recommendations:**
- **Mobile-first reconsideration** for the three high-frequency flows:
  1. Finding a project (read-only browse) → should work beautifully on mobile
  2. Quick status check ("Is this draft or public?") → should work on mobile
  3. Sharing a project with a client → should work on mobile
- Everything else (editing, bulk operations, CSV import) can remain desktop-only.

### 2.3 Color/status semantics are inconsistent ✅ shipped (B5)

> `docs/DESIGN-SYSTEM.md` added, WCAG AA gray-scale fix applied, in-app design system docs shipped.

The app uses colors like `--c-ai` for AI-generated content, amber/rose dots for missing fields, green for "linked", red for "error". But there's no documented system.

**Recommendations:**
- **Design tokens document**: formalize what each color means. `docs/DESIGN-SYSTEM.md` exists but may not cover semantic tokens.
- **Accessibility pass**: verify WCAG AA contrast on all text + backgrounds. With Tailwind v4 custom properties, this is easy to audit.

### 2.4 Loading states are inconsistent ✅ shipped (B6)

> Skeleton loading states standardized across pages.

Some pages have skeletons (recently added), some show "Loading..." text, some show nothing. The three levels of UX quality are visible.

**Recommendation:** Standardize on skeletons everywhere there's a `loading.tsx` or Suspense boundary. Remove all bare "Loading..." strings.

### 2.5 Error handling is silent ✅ mostly shipped

> Global toast infrastructure ✅ shipped (`src/lib/toast.ts` + `sonner` used in 14+ components). Full audit of silent `catch` blocks may still be partial — worth flagging in the upcoming review.

Many try/catch blocks swallow errors (`catch { /* ignore */ }`). Users see nothing when something fails — the button just stops working.

**Recommendation:**
- **Global toast notification system** (sonner or similar, ~3KB). Every error becomes a non-blocking toast with a "Retry" action.
- Replace every silent `catch` with a toast.

### 2.6 History/audit is underused ✅ shipped (B7)

> Last-edited badge on project detail + activity feed on home shipped. Undo toast after destructive actions — status less clear.

The `project_history` table exists but the History panel is buried in edit mode. No one will find it.

**Recommendations:**
- **"Last edited by X, Y minutes ago"** shown on every project detail page header.
- **Activity feed** on the home page showing recent edits across the archive (like GitHub's "recent activity").
- **Undo**: after a destructive action (delete media, remove from collection), show a toast with "Undo" for 10 seconds.

---

## Part 3: Suggested New Features (Strategic)

These are grounded in Accurat's goals: preserving + showcasing case studies, supporting business development, enabling internal knowledge sharing.

### 3.1 Smart Search and Discovery ⭐ (High Impact) ⏸ backlog

> Fuzzy search via Fuse.js shipped. Semantic search via pgvector **not shipped — explicitly moved to backlog** for future consideration.

Use Claude to embed every project description into a vector. Store embeddings in Supabase (pgvector). Then:
- **Semantic search**: "projects that use AI to visualize scientific data" works even if no project uses those exact words.
- **"More like this"**: better related-projects algorithm than the current weighted overlap.
- **Question answering**: "Which projects have we done for healthcare clients in the last 3 years?" returns a curated list with rationale.

**Effort**: medium. Supabase supports pgvector natively. Anthropic doesn't offer embeddings but OpenAI's are cheap (~$0.02 per 1000 texts). One-time backfill script + a hook on project save.

### 3.2 Pitch Deck Generator ✅ shipped (B1)

> PPTX Pitch Deck Generator with per-project image picker shipped (`pptxgenjs`, `src/components/collections/PitchDeckExporter.tsx`).

Build on the existing PPTX export. Let users select a collection + template and generate a branded pitch deck:
- Cover slide with client name and challenge
- One slide per project (auto-populated with hero, tagline, challenge, solution, outcome)
- **Per-project image picker**: when generating, the user can choose *which* images from each case study to include in the deck (not just the hero). Multi-select from the project's media gallery.
- Closing slide with contact info
- Accurat branding baked in

**Effort**: low-medium. `pptxgenjs` is already planned. The heavy lifting is the template + layout code + image picker UI.

### 3.3 AI-Assisted Collection Builder (integrated with "New Collection") ✅ shipped

> AI Collection Builder integrated into the New Collection wizard (`src/components/collections/NewCollectionWizard.tsx`). Generates collection subtitle, section titles, and per-project relevance paragraphs from a pasted brief.

Instead of a separate "Proposal Writer" page, integrate AI suggestions directly into the **New Collection** flow. When creating a collection, the user has the option to paste an RFP or prospect description, and the system suggests case studies + auto-builds the collection structure.

Workflow:
1. User clicks "New Collection" → form has an optional **"Prospect brief / RFP"** textarea
2. If filled, Claude reads the brief, queries semantic search (3.1) for relevant case studies
3. System proposes a list of 5-10 case studies, each with a **"Why it's relevant"** paragraph explaining the connection to the brief
4. User reviews each suggestion, can approve, swap, or add others manually
5. For any project the user adds manually, the system auto-generates the relevance paragraph
6. Once the project list is finalized, the system **automatically creates the collection**, organized into **sections (groups)** with:
   - Section titles (e.g., "Strategic Approach", "Visual Identity", "Technical Implementation")
   - Section subtitles explaining the theme
   - Per-project captions reflecting why each project is relevant for *this* proposal
7. User lands on the new collection page and can refine, share, or export to PPTX

**Why this is better than a separate page:** it leverages the existing collection infrastructure (groups, captions, sharing, export) and turns "creating a collection" into the natural unit of work for proposal building. No new top-level concept.

**Effort**: medium. Builds on semantic search (3.1), the existing collection groups feature, and the existing AI infrastructure.

### 3.4 Skill / Capability Inventory ✅ shipped (C1/C2)

> Capability inventory dashboard shipped at `(app)/capabilities`.

Infer Accurat's capabilities from the archive itself:
- Auto-extract technologies, methods, outputs from project descriptions
- Build a capability matrix: "We've done 12 interactive dashboards, 8 AR experiences, 34 data visualizations..."
- Useful for: proposal writing, new-hire orientation, identifying capability gaps

**Effort**: medium. One-time AI analysis + a nice dashboard.

### 3.5 Client Intelligence Dashboard ✅ shipped (C3)

> Client intelligence dashboard shipped at `(app)/clients`.

Building on the engagements data + client relationship focus:
- **Client health score**: last engagement date, revenue trend, project count, description completeness
- **"Cold" clients**: haven't had an engagement in 2+ years but have case studies — re-engage candidates
- **Top growing clients**: revenue up YoY
- **Dormant Tier 1**: high-tier clients with recent gaps

**Effort**: low. Pure SQL over existing data.

### 3.6 Team Contribution View ✅ shipped (C4)

> Team contribution view shipped at `(app)/team`.

The `team` field already exists on projects. Build:
- Individual contributor pages: "Projects worked on by Person X"
- Team-based filtering: "Show me everything the tech team has done"
- Useful for performance reviews, portfolio building for individuals leaving Accurat

**Effort**: low. Mostly a view over existing data.

### 3.7 Versioned Case Studies (Draft/Published Separation) ✅ shipped (C5)

> Draft/published split shipped (migrations 013 `case_study_drafts`, 016 `published_version`).

Currently, editing a case study updates it live. There's no way to have a "working draft" while the "published" version is visible to shared links.

**Recommendation**: add a `published_version` JSONB field. Edits update `draft`. "Publish" promotes draft → published. Shared links always show published.

**Effort**: medium. DB migration + UI changes.

### 3.8 Auto-tag Suggestions from Content ✅ shipped (C6)

> AI-powered tag suggestions shipped (`src/components/edit/SuggestedTags.tsx`).

When a user writes a case study description, suggest tags based on content (domains, services, technologies). Use Claude for this.

**Effort**: low. Builds on the existing AI infrastructure.

---

## Priority Recommendations

**Status reconciled 2026-04-21.** Of the top 5 items, four shipped, one is in the backlog.

| # | Feature | Status | Evidence |
|---|---------|--------|----------|
| 1 | **URL-sync filters** | ✅ shipped | `src/hooks/use-url-filters.ts` + `useSearchParams` across 10+ files |
| 2 | **Semantic search (pgvector)** | ⏸ backlog | Not shipped; moved to backlog. `accurat-archive-web/CLAUDE.md` and `ARCHITECTURE.md §11`. |
| 3 | **Global toast + error handling** | ✅ shipped | `src/lib/toast.ts` + `sonner` used in 14+ components |
| 4 | **Client Intelligence Dashboard** | ✅ shipped | `(app)/clients` dashboard (commit C3) |
| 5 | **Pitch Deck Generator** | ✅ shipped | `src/components/collections/PitchDeckExporter.tsx` (commit B1) |

The compounding effect predicted above is now live: better filtering + search + discovery + business tooling have turned the archive from a records system into a strategic asset. Next strategic leap (when/if pursued): semantic search to unlock true content-based discovery across the 200+ projects.
