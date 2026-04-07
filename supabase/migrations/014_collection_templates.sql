CREATE TABLE IF NOT EXISTS collection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  groups JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO collection_templates (name, description, groups) VALUES
  ('New client pitch', 'Standard structure for pitching a new client', '[{"name": "Strategic approach", "subtitle": "How we think about the work"}, {"name": "Visual identity", "subtitle": "Design language and craft"}, {"name": "Technical execution", "subtitle": "Tools and methods"}, {"name": "Outcomes", "subtitle": "Results and impact"}]'::jsonb),
  ('Capability overview', 'Cross-section of work showcasing different domains', '[{"name": "Data visualization", "subtitle": ""}, {"name": "Interactive experiences", "subtitle": ""}, {"name": "Brand systems", "subtitle": ""}, {"name": "Reports & publications", "subtitle": ""}]'::jsonb),
  ('Annual report', 'Year-in-review style retrospective', '[{"name": "Highlights", "subtitle": "Featured projects"}, {"name": "By the numbers", "subtitle": "Volume and reach"}, {"name": "What''s next", "subtitle": "Looking ahead"}]'::jsonb);
