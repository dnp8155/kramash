-- ============================================================
-- 0015 — Public Profile RLS Policy
-- Allows anyone (even unauthenticated) to read workspaces
-- where public_profile_enabled = true.
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================

-- Drop existing policy if re-running
DROP POLICY IF EXISTS workspaces_read_public_profile ON workspaces;

-- Allow public read of workspaces that have public profile enabled
CREATE POLICY workspaces_read_public_profile ON workspaces FOR SELECT
  USING (public_profile_enabled = true);