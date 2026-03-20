-- Add share token to projects for shareable links
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT NULL;

-- Indexes for public queries
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_collections_share_token ON collections(share_token) WHERE share_token IS NOT NULL;
