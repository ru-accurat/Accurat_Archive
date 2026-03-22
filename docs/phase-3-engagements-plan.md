# Phase 3: Engagements & Client Intelligence

## Context

Accurat has ~605 engagement line items (2018–2026) tracking revenue per project per year. These don't map 1:1 to case studies: one case study may span multiple engagements, and many engagements never become case studies. We need a dedicated financial layer with a `clients` table as a first-class entity linking both engagements and case studies.

The user has an XLSX file (`Progetti Accurat (2018-2026) (1).xlsx`) with columns: Year, Project Name, Client, EUR amount, USD amount. Client names are inconsistent across years (e.g., "BlackKnight" vs "Black Knight"). Import must auto-match with easy override.

---

## Step 1: SQL Migration (`008_clients_and_engagements.sql`)

### Tables

```sql
-- Canonical client records
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial engagement records
CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  original_client_name TEXT NOT NULL,  -- preserve import spelling
  amount_eur NUMERIC(12,2),
  amount_usd NUMERIC(12,2),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: engagements ↔ case studies
CREATE TABLE engagement_projects (
  engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (engagement_id, project_id)
);

-- Link projects to canonical clients
ALTER TABLE projects ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
```

Indexes on `engagements(year)`, `engagements(client_id)`, `projects(client_id)`, GIN on `clients(aliases)`.

Auto-`updated_at` triggers on clients and engagements.

### Seed clients from existing projects

After migration, run a one-time seed: extract distinct `client` values from `projects`, create `clients` rows, backfill `projects.client_id`. This happens in the migration SQL itself.

**Files**: `supabase/migrations/008_clients_and_engagements.sql`

---

## Step 2: Types & Data Layer

### New types in `src/lib/types.ts`

```typescript
export interface Client {
  id: string
  name: string
  aliases: string[]
  notes: string
}

export interface Engagement {
  id: string
  year: number
  projectName: string
  clientId: string
  clientName?: string        // joined from clients table
  originalClientName: string
  amountEur: number | null
  amountUsd: number | null
  notes: string
  linkedProjects?: Project[] // when fetched with joins
}
```

### New mapping functions in `src/lib/db-utils.ts`

`rowToEngagement()` / `engagementToRow()` following existing pattern.
`rowToClient()` / `clientToRow()` following existing pattern.

---

## Step 3: Client Fuzzy Matching (`src/lib/client-matching.ts`)

Matching algorithm:
1. **Normalize**: lowercase, strip spaces/hyphens/punctuation → "BlackKnight" and "Black Knight" both become "blackknight"
2. **Exact normalized match**: Check against `clients.name` (normalized) and all `clients.aliases` (normalized)
3. **Levenshtein distance**: For remaining unmatched, find closest client with distance ≤ 3 and string length ratio > 0.7
4. Return matches with confidence: `exact` (normalized match), `fuzzy` (Levenshtein), `none`

No external dependencies — implement simple Levenshtein in ~20 lines.

**Files**: `src/lib/client-matching.ts`

---

## Step 4: XLSX Import API

### Install dependency
`npm install xlsx` — SheetJS handles CSV, XLS, and XLSX with a single API

### `POST /api/engagements/import/parse`
- Accepts FormData with file (CSV, XLS, or XLSX)
- Detects format by extension, parses with SheetJS (`read` for binary, PapaParse as fallback for CSV)
- Skips year-separator rows and footer
- Extracts unique client names from the file
- Runs fuzzy matching against existing `clients` table
- Returns: `{ rows: ParsedRow[], clientMatches: { original: string, matchedClient: Client | null, confidence: string }[] }`

### `POST /api/engagements/import/apply`
- Accepts: `{ rows, clientMappings: { original: string, clientId: string | null, newClientName?: string }[] }`
- Creates new clients where `clientId` is null and `newClientName` is provided
- Stores aliases (the `original` name) on matched/new clients
- Inserts engagement rows with `client_id` and `original_client_name`
- Deduplication: skip rows where (year + project_name + client_id) already exists
- Returns: `{ inserted: number, skipped: number, clientsCreated: number }`

**Files**: `src/app/api/engagements/import/parse/route.ts`, `src/app/api/engagements/import/apply/route.ts`

---

## Step 5: Engagements CRUD API

### `GET /api/engagements`
- Query params: `year`, `clientId`, `linked` (true/false), `limit`, `offset`
- Joins with `clients` to include `clientName`
- Joins with `engagement_projects` to include linked project count
- Returns sorted by year DESC, amount_eur DESC

### `PATCH /api/engagements/[id]`
- Update any field: project_name, client_id, amount_eur, amount_usd, notes
- If client name is changed (new text), find or create client, update client_id

### `DELETE /api/engagements/[id]`

### `POST /api/engagements/[id]/link`
- Body: `{ projectIds: string[] }`
- Insert into `engagement_projects`

### `DELETE /api/engagements/[id]/link`
- Body: `{ projectIds: string[] }`
- Remove from `engagement_projects`

### `GET /api/clients`
- List all clients with engagement count and project count

### `PATCH /api/clients/[id]`
- Update name, aliases, notes

**Files**: `src/app/api/engagements/route.ts`, `src/app/api/engagements/[id]/route.ts`, `src/app/api/engagements/[id]/link/route.ts`, `src/app/api/clients/route.ts`, `src/app/api/clients/[id]/route.ts`

---

## Step 6: API Client Methods

Add to `src/lib/api-client.ts`:
- `getEngagements(params)`, `updateEngagement(id, data)`, `deleteEngagement(id)`
- `linkEngagementProjects(id, projectIds)`, `unlinkEngagementProjects(id, projectIds)`
- `getClients()`, `updateClient(id, data)`
- `parseEngagementImport(file)`, `applyEngagementImport(payload)`

---

## Step 7: Engagements Page (`src/app/(app)/engagements/page.tsx`)

### Layout
- Full-width page, max-w-[1200px]
- Header: "Engagements" title + "Import XLSX" button (top right)
- Summary row: Total revenue (all time), Current year revenue, # clients, # unlinked engagements
- Year filter tabs (2018–2026 + "All")
- Client filter dropdown
- Linked/Unlinked toggle

### Table (main content)
- Columns: Year, Project Name, Client, EUR, USD, Linked Projects, Actions
- **Inline editing**: Click any text cell → input field appears, blur/Enter saves via PATCH
- Client cell: Click → dropdown with existing clients + "Create new" option
- EUR/USD cells: Number input, formatted with locale
- Linked Projects: Chip count, click opens linking modal
- Sortable columns (year, client, EUR)

### Import Modal (`src/components/engagements/ImportModal.tsx`)
- Step 1: File upload (drag & drop or click) — accepts .csv, .xls, .xlsx
- Step 2: Client matching review — table showing: Original Name → Matched Client (dropdown to override) → Confidence badge
  - Green = exact match, Yellow = fuzzy, Red = no match
  - Unmatched rows get "Create new client" by default, overridable
- Step 3: Confirm → progress bar → result summary

### Linking Modal (`src/components/engagements/ProjectLinker.tsx`)
- Search input filtering case studies
- Pre-filtered to same client
- Checkbox list of matching projects
- Shows currently linked projects with unlink option

**Files**: `src/app/(app)/engagements/page.tsx`, `src/components/engagements/ImportModal.tsx`, `src/components/engagements/ProjectLinker.tsx`

---

## Step 8: Revenue Summary Cards

At top of engagements page, 4 cards:
1. **Total Revenue** — sum of all EUR
2. **This Year** — sum of current year EUR
3. **Clients** — count of distinct clients
4. **Unlinked** — count of engagements with no linked projects

Plus a simple bar chart showing EUR revenue by year (custom CSS bars, same approach as timeline — no charting library needed).

---

## Step 9: Project Detail Integration

On `src/app/(app)/project/[id]/page.tsx`:
- New section below Related Projects: "Engagements"
- Shows linked engagements (year, name, EUR amount)
- Total revenue from all linked engagements
- Button to link more engagements (opens ProjectLinker filtered by client)

API: `GET /api/projects/[id]/engagements` — returns engagements linked to this project

**Files**: `src/app/api/projects/[id]/engagements/route.ts`, `src/components/project/LinkedEngagements.tsx`

---

## Step 10: Navigation

Add "Engagements" link to AppShell nav (desktop + mobile), admin-only visibility (check `profile?.role === 'admin'`).

**File**: `src/components/layout/AppShell.tsx`

---

## File Summary

| New Files | Purpose |
|-----------|---------|
| `supabase/migrations/008_clients_and_engagements.sql` | clients, engagements, engagement_projects tables |
| `src/lib/client-matching.ts` | Fuzzy client name matching |
| `src/app/api/engagements/route.ts` | GET engagements list |
| `src/app/api/engagements/[id]/route.ts` | PATCH/DELETE engagement |
| `src/app/api/engagements/[id]/link/route.ts` | Link/unlink projects |
| `src/app/api/engagements/import/parse/route.ts` | Parse XLSX import |
| `src/app/api/engagements/import/apply/route.ts` | Apply import |
| `src/app/api/clients/route.ts` | GET clients list |
| `src/app/api/clients/[id]/route.ts` | PATCH client |
| `src/app/api/projects/[id]/engagements/route.ts` | GET linked engagements |
| `src/app/(app)/engagements/page.tsx` | Engagements page |
| `src/components/engagements/ImportModal.tsx` | XLSX import wizard |
| `src/components/engagements/ProjectLinker.tsx` | Link engagements to projects |
| `src/components/project/LinkedEngagements.tsx` | Engagements on project detail |

| Modified Files | Changes |
|----------------|---------|
| `src/lib/types.ts` | Add Client, Engagement interfaces |
| `src/lib/db-utils.ts` | Add row mapping functions |
| `src/lib/api-client.ts` | Add engagement/client API methods |
| `src/components/layout/AppShell.tsx` | Add Engagements nav link (admin-only) |
| `src/app/(app)/project/[id]/page.tsx` | Add LinkedEngagements section |

---

## Verification

1. `npx next build` — no type errors
2. Import the XLSX file → verify client matching review shows correct suggestions
3. Confirm imported data shows in engagements table with inline edit working
4. Link an engagement to a case study → verify it shows on project detail
5. Test batch status update → verify draft/public assignment
6. Test collection improvements (add, batch remove, delete label)
