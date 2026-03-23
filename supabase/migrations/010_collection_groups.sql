-- Collection sub-groups
CREATE TABLE collection_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_groups_collection ON collection_groups(collection_id);

-- Add group_id to collection_items (nullable — ungrouped items have NULL)
ALTER TABLE collection_items ADD COLUMN group_id UUID REFERENCES collection_groups(id) ON DELETE SET NULL;
