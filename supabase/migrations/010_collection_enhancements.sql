-- Add subtitle to collections (collection-level subtitle)
ALTER TABLE collections ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';

-- Add subtitle to collection_groups
ALTER TABLE collection_groups ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';

-- Add caption to collection_items (per-project, per-collection custom caption)
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT '';
