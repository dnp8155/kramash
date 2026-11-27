-- ============================================================
-- 0036 — Portal passwords that stay put and are always viewable
--
-- Before: the portal password was stored only as a hash, so the admin could see it only in the browser that
-- generated it, and every "Share" / "Regenerate" silently killed the password already sent to the client.
-- Now:
--   * portal_password_plain          — the current password, so any admin on any device can copy / re-share it
--   * portal_password_changed_at     — shown as "Last changed …"
--   * portal_prev_password_hash/_until — after a regenerate the OLD password keeps working for a grace window
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_password_plain TEXT,
  ADD COLUMN IF NOT EXISTS portal_password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_prev_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS portal_prev_password_until TIMESTAMPTZ;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS portal_password_plain TEXT,
  ADD COLUMN IF NOT EXISTS portal_password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_prev_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS portal_prev_password_until TIMESTAMPTZ;

-- True when p_password matches a "salt:sha256(salt:password)" hash.
CREATE OR REPLACE FUNCTION portal_hash_matches(p_stored TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path TO public, extensions
AS $$
  SELECT COALESCE(p_stored, '') <> ''
    AND position(':' IN p_stored) > 0
    AND encode(digest(split_part(p_stored, ':', 1) || ':' || COALESCE(p_password, ''), 'sha256'), 'hex')
        = split_part(p_stored, ':', 2);
$$;

-- verify_client_portal: current password, or the previous one while its grace window is open.
CREATE OR REPLACE FUNCTION verify_client_portal(p_token TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_client RECORD;
BEGIN
  SELECT id, workspace_id, name, portal_password_hash, portal_access_token,
         portal_prev_password_hash, portal_prev_password_until
  INTO v_client
  FROM clients
  WHERE portal_access_token = p_token AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'This link is no longer active. Please contact your service provider.');
  END IF;

  IF portal_hash_matches(v_client.portal_password_hash, p_password)
     OR (v_client.portal_prev_password_until IS NOT NULL
         AND v_client.portal_prev_password_until > now()
         AND portal_hash_matches(v_client.portal_prev_password_hash, p_password)) THEN
    RETURN json_build_object(
      'success', true,
      'session_token', v_client.portal_access_token,
      'client_id', v_client.id,
      'workspace_id', v_client.workspace_id,
      'client_name', v_client.name
    );
  END IF;

  RETURN json_build_object('error', 'Incorrect password. Please try again.');
END;
$$;

-- verify_team_portal: same grace behaviour for team members.
CREATE OR REPLACE FUNCTION verify_team_portal(p_token TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_member RECORD;
BEGIN
  SELECT id, workspace_id, name, portal_password_hash, portal_access_token,
         portal_prev_password_hash, portal_prev_password_until
  INTO v_member
  FROM team_members
  WHERE portal_access_token = p_token AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'This link is no longer active. Please contact your service provider.');
  END IF;

  IF portal_hash_matches(v_member.portal_password_hash, p_password)
     OR (v_member.portal_prev_password_until IS NOT NULL
         AND v_member.portal_prev_password_until > now()
         AND portal_hash_matches(v_member.portal_prev_password_hash, p_password)) THEN
    RETURN json_build_object(
      'success', true,
      'session_token', v_member.portal_access_token,
      'team_member_id', v_member.id,
      'workspace_id', v_member.workspace_id,
      'member_name', v_member.name
    );
  END IF;

  RETURN json_build_object('error', 'Incorrect password. Please try again.');
END;
$$;

GRANT EXECUTE ON FUNCTION verify_client_portal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_team_portal TO anon, authenticated;
