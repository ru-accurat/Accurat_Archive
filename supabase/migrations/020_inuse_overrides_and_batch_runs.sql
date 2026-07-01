-- 020: In-use image regeneration support.
-- Per-project overrides for auto-inferred generation params, and a
-- batch-run progress table for the regeneration script (resumable).

CREATE TABLE IF NOT EXISTS inuse_overrides (
  project_id     text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  device         text,
  surface        text,
  include_human  boolean,
  framing        text,
  environment    text,
  notes          text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inuse_batch_runs (
  run_id       text NOT NULL,
  project_id   text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('pending', 'done', 'failed', 'skipped')),
  started_at   timestamptz,
  finished_at  timestamptz,
  error        text,
  kept_files   text[],
  archived_to  text,
  PRIMARY KEY (run_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_inuse_batch_runs_status ON inuse_batch_runs(run_id, status);
