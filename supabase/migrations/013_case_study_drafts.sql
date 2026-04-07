CREATE TABLE IF NOT EXISTS case_study_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  fields JSONB NOT NULL,
  quality TEXT NOT NULL DEFAULT 'fast',
  reference_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  is_iterative BOOLEAN NOT NULL DEFAULT false,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_study_drafts_project ON case_study_drafts(project_id, created_at DESC);
