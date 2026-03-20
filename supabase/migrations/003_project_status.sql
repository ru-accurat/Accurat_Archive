-- Phase 1B: Project Status / Publication Workflow
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'internal', 'public'));
