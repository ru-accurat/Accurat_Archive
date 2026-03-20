-- Phase 2D: Map View — location fields
-- Run this in the Supabase SQL Editor

ALTER TABLE projects ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN latitude DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE projects ADD COLUMN longitude DOUBLE PRECISION DEFAULT NULL;
