-- 019: Extend role CHECK to include content_reader (no Clients/Engagements).
-- Roles:
--   admin          — full access, can delete
--   editor         — full read + write
--   viewer         — full read-only (all-access reader)
--   content_reader — read-only, no Clients/Engagements visibility
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'editor', 'viewer', 'content_reader'));
