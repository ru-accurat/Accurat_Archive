-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  client TEXT NOT NULL,
  project_name TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 3,
  section TEXT NOT NULL DEFAULT '',
  start_year INTEGER,
  end_year INTEGER,
  domains TEXT[] NOT NULL DEFAULT '{}',
  services TEXT[] NOT NULL DEFAULT '{}',
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  challenge TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  deliverables TEXT NOT NULL DEFAULT '',
  client_quotes TEXT NOT NULL DEFAULT '',
  team TEXT[] NOT NULL DEFAULT '{}',
  urls TEXT[] NOT NULL DEFAULT '{}',
  output TEXT NOT NULL DEFAULT '',
  folder_name TEXT NOT NULL,
  media_order TEXT[],
  hero_image TEXT,
  thumb_image TEXT,
  ai_generated TEXT[] DEFAULT '{}',
  client_logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_client ON projects(client);
CREATE INDEX idx_projects_tier ON projects(tier);

-- History table
CREATE TABLE project_history (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_project ON project_history(project_id, created_at DESC);

-- Config table
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
