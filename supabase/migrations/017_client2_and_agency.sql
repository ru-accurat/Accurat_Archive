-- 017: Add client_2, client_id_2, agency, agency_id to projects
-- Plus backfill of "A + B" client strings into client / client_2.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_2 text,
  ADD COLUMN IF NOT EXISTS client_id_2 uuid REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client_id_2 ON projects(client_id_2);
CREATE INDEX IF NOT EXISTS idx_projects_agency_id ON projects(agency_id);

-- Backfill: split 'A + B' strings into client / client_2
UPDATE projects
SET
  client = trim(split_part(client, '+', 1)),
  client_2 = trim(split_part(client, '+', 2))
WHERE client LIKE '%+%' AND client_2 IS NULL;

-- Link client_id_2 to existing clients table by name/alias when possible
UPDATE projects p
SET client_id_2 = c.id
FROM clients c
WHERE p.client_2 IS NOT NULL
  AND p.client_id_2 IS NULL
  AND (lower(c.name) = lower(p.client_2) OR lower(p.client_2) = ANY(SELECT lower(unnest(c.aliases))));
