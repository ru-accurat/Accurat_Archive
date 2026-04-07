-- Per-user saved filter presets for the project list page.
-- Each user has their own presets, scoped via RLS.

CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  sort_field TEXT,
  sort_direction TEXT,
  view_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_filter_presets_user_id ON filter_presets(user_id);

-- Auto-update updated_at on modifications
CREATE OR REPLACE FUNCTION update_filter_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS filter_presets_updated_at ON filter_presets;
CREATE TRIGGER filter_presets_updated_at
  BEFORE UPDATE ON filter_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_filter_presets_updated_at();

-- Row-level security: each user can only see/modify their own presets.
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own presets" ON filter_presets;
CREATE POLICY "Users can view own presets"
  ON filter_presets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own presets" ON filter_presets;
CREATE POLICY "Users can insert own presets"
  ON filter_presets FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own presets" ON filter_presets;
CREATE POLICY "Users can update own presets"
  ON filter_presets FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own presets" ON filter_presets;
CREATE POLICY "Users can delete own presets"
  ON filter_presets FOR DELETE
  USING (user_id = auth.uid());
