-- Phase 1A: Authentication & Roles
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Enable RLS on projects (read: everyone, write: admin/editor, delete: admin)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Admin and editor can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admin and editor can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Only admin can delete projects"
  ON projects FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Grant access to profiles table for authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- 6. Create your first admin user (run AFTER creating the user in Supabase Auth):
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@accurat.it';
