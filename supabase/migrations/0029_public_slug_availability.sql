-- ============================================================
-- 0029 — Public profile URL: availability check + permanent lock
-- Run this in Supabase SQL Editor.
-- Slugs are unique across all workspaces (idx_workspaces_slug), but RLS hides
-- unpublished workspaces from other users, so the client can't tell whether a
-- slug is taken. This SECURITY DEFINER function answers only yes/no.
-- ============================================================

CREATE OR REPLACE FUNCTION is_public_slug_available(p_slug TEXT, p_workspace_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE lower(public_profile_slug) = lower(p_slug)
      AND (p_workspace_id IS NULL OR id <> p_workspace_id)
  );
$$;

GRANT EXECUTE ON FUNCTION is_public_slug_available(TEXT, UUID) TO authenticated;

-- Once a slug is set it is permanent (shared links must never break).
-- Direct SQL / service-role changes (no auth.uid()) are still allowed.
CREATE OR REPLACE FUNCTION lock_public_profile_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.public_profile_slug IS NOT NULL
     AND btrim(OLD.public_profile_slug) <> ''
     AND NEW.public_profile_slug IS DISTINCT FROM OLD.public_profile_slug
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Public profile URL cannot be changed once saved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_public_profile_slug ON workspaces;
CREATE TRIGGER trg_lock_public_profile_slug
  BEFORE UPDATE OF public_profile_slug ON workspaces
  FOR EACH ROW EXECUTE FUNCTION lock_public_profile_slug();
