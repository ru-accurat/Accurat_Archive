-- Phase 1D: Activity Log
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_project ON activity_log(project_id);
