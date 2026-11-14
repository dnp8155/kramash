-- ============================================================
-- 0007 — Alter profiles FK for data migration
-- ============================================================
-- The profiles table has id REFERENCES auth.users(id) ON DELETE CASCADE.
-- This FK is dropped to allow importing Base44 user IDs (which don't
-- exist in Supabase auth.users yet).
-- After migration, create Supabase auth users and update profiles
-- to link them via the Supabase auth system.
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_key;