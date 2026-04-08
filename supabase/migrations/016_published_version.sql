ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_version JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_projects_published_at ON projects(published_at DESC);
