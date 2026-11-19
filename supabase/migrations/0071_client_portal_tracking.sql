-- ============================================================
-- 0071 — Track inside the signed-in Client Portal (optional) + the provider card details
--
-- get_client_portal_tracking(session_token, client_id): for each of the client's events whose owner switched
-- Track sharing on (events.public_tracking_enabled), the items (quantity, title, status, note, expected date).
-- Same session check as get_client_portal_data. Events with sharing off are not returned, and nothing is returned
-- when the business turned Track off in Preferences (display_preferences.showTrackTab = false).
--
-- get_client_portal_provider(session_token, client_id): city, type, tagline (for the "Your Service Provider" card)
-- and track_labels (the business's names for the last two Track statuses, from display_preferences.trackStatusNames).
-- Safe to re-run.
-- ============================================================

-- The workspace's display preferences as an object, whether stored as an object or as a JSON string. Internal helper.
CREATE OR REPLACE FUNCTION track_workspace_prefs(p_ws UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v JSONB;
BEGIN
  SELECT display_preferences INTO v FROM workspaces WHERE id = p_ws;
  IF v IS NULL THEN RETURN '{}'::jsonb; END IF;
  IF jsonb_typeof(v) = 'string' THEN
    BEGIN
      v := (v #>> '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RETURN '{}'::jsonb;
    END;
  END IF;
  IF jsonb_typeof(v) <> 'object' THEN RETURN '{}'::jsonb; END IF;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION track_workspace_prefs(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION get_client_portal_tracking(p_session_token TEXT, p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_client RECORD;
  v_prefs JSONB;
  v_result JSON;
BEGIN
  SELECT id, workspace_id INTO v_client
  FROM clients
  WHERE id = p_client_id
    AND portal_access_token = p_session_token
    AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '[]'::json;
  END IF;

  v_prefs := track_workspace_prefs(v_client.workspace_id);
  IF COALESCE(v_prefs->>'showTrackTab', 'true') = 'false' THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'event_id', e.id,
    'items', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', d.id, 'title', d.title, 'quantity', d.quantity, 'status', d.status,
        'note', COALESCE(d.note, ''), 'expected_date', d.expected_date
      ) ORDER BY d.created_at), '[]'::json)
      FROM event_deliverables d
      WHERE d.event_id = e.id AND d.workspace_id = e.workspace_id
    )
  ) ORDER BY e.start_date DESC), '[]'::json) INTO v_result
  FROM events e
  WHERE e.workspace_id = v_client.workspace_id
    AND e.client_id = v_client.id
    AND e.public_tracking_enabled = true
    AND EXISTS (SELECT 1 FROM event_deliverables x WHERE x.event_id = e.id);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_portal_tracking TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_client_portal_provider(p_session_token TEXT, p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_ws UUID;
  v_prefs JSONB;
  v_names JSONB;
  v_result JSON;
BEGIN
  SELECT workspace_id INTO v_ws
  FROM clients
  WHERE id = p_client_id
    AND portal_access_token = p_session_token
    AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{}'::json;
  END IF;

  v_prefs := track_workspace_prefs(v_ws);
  v_names := CASE WHEN jsonb_typeof(v_prefs->'trackStatusNames') = 'array' THEN v_prefs->'trackStatusNames' ELSE '[]'::jsonb END;

  SELECT json_build_object(
    'city', COALESCE(w.city, ''),
    'business_category', COALESCE(w.business_category::text, ''),
    'custom_business_type', COALESCE(w.custom_business_type, ''),
    'tagline', COALESCE(w.tagline, ''),
    'track_labels', json_build_array(
      COALESCE(NULLIF(left(btrim(v_names->>0), 20), ''), 'Sent to client'),
      COALESCE(NULLIF(left(btrim(v_names->>1), 20), ''), 'Delivered')
    )
  ) INTO v_result
  FROM workspaces w WHERE w.id = v_ws;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_portal_provider TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
