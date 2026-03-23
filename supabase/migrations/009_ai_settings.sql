-- AI settings: stores writing guidelines and reference documents
CREATE TABLE IF NOT EXISTS ai_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with initial keys (values will be populated via the admin UI or API)
INSERT INTO ai_settings (key, value) VALUES
  ('guidelines', ''),
  ('voice', ''),
  ('company', ''),
  ('market', ''),
  ('projects', '')
ON CONFLICT (key) DO NOTHING;
