-- 008: Clients, Engagements, and Import Batches
-- Canonical client records
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track import batches for undo
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial engagement records
CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  original_client_name TEXT NOT NULL,
  amount_eur NUMERIC(12,2),
  amount_usd NUMERIC(12,2),
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: engagements <-> case studies
CREATE TABLE engagement_projects (
  engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (engagement_id, project_id)
);

-- Link projects to canonical clients
ALTER TABLE projects ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_engagements_year ON engagements(year);
CREATE INDEX idx_engagements_client ON engagements(client_id);
CREATE INDEX idx_engagements_batch ON engagements(import_batch_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_clients_aliases ON clients USING GIN(aliases);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed clients from existing projects
INSERT INTO clients (name)
SELECT DISTINCT client FROM projects WHERE client IS NOT NULL AND client != ''
ON CONFLICT (name) DO NOTHING;

-- Backfill projects.client_id
UPDATE projects p
SET client_id = c.id
FROM clients c
WHERE p.client = c.name;
