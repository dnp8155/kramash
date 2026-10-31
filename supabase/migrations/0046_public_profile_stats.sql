-- Public profile stats ("Clients served", "<Projects> completed", "Team members").
-- The public page is viewed by anonymous visitors who cannot read clients/events/team_members (RLS), so the
-- counts come from this SECURITY DEFINER function. It returns a count only when the profile is published AND
-- the owner switched that stat on (display_preferences.public_show_stat_*, off by default); otherwise NULL.
--
-- display_preferences is a JSONB column, but the app saves it with JSON.stringify(...), so it is stored as a JSON
-- *string*, not an object. The function reads both shapes. It is safe to run again (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION get_public_profile_stats(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
DECLARE
  v_ws RECORD;
  v_dp JSONB;
  v_clients BIGINT;
  v_works BIGINT;
  v_team BIGINT;
BEGIN
  SELECT id, display_preferences INTO v_ws
  FROM workspaces
  WHERE public_profile_slug = p_slug AND public_profile_enabled = true
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_dp := '{}'::jsonb;
  BEGIN
    IF v_ws.display_preferences IS NULL THEN
      v_dp := '{}'::jsonb;
    ELSIF jsonb_typeof(v_ws.display_preferences) = 'object' THEN
      v_dp := v_ws.display_preferences;
    ELSIF jsonb_typeof(v_ws.display_preferences) = 'string' THEN
      -- #>> '{}' returns the string's text without the surrounding quotes/escapes.
      v_dp := COALESCE(NULLIF(v_ws.display_preferences #>> '{}', '')::jsonb, '{}'::jsonb);
    END IF;
  EXCEPTION WHEN others THEN
    v_dp := '{}'::jsonb;
  END;

  IF jsonb_typeof(v_dp) IS DISTINCT FROM 'object' THEN v_dp := '{}'::jsonb; END IF;

  IF COALESCE((v_dp->>'public_show_stat_clients')::boolean, false) THEN
    SELECT COUNT(DISTINCT client_id) INTO v_clients
    FROM events WHERE workspace_id = v_ws.id AND status = 'completed';
  END IF;
  IF COALESCE((v_dp->>'public_show_stat_works')::boolean, false) THEN
    SELECT COUNT(*) INTO v_works
    FROM events WHERE workspace_id = v_ws.id AND status = 'completed';
  END IF;
  IF COALESCE((v_dp->>'public_show_stat_team')::boolean, false) THEN
    SELECT COUNT(*) INTO v_team
    FROM team_members WHERE workspace_id = v_ws.id AND status = 'active' AND COALESCE(is_self, false) = false;
  END IF;

  RETURN json_build_object('clients', v_clients, 'works', v_works, 'team', v_team);
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_profile_stats(TEXT) TO anon, authenticated;
