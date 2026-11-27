-- ============================================================
-- 0079 — "Work from others": a business's bookings shown inside a team member's OWN Kramasha app
-- A business (owner) switches it on per team member (team_members.member_app_sharing). The team member, signed in to
-- Kramasha with the SAME verified email as on the business's Team page, is asked once and must accept
-- (member_app_status = 'accepted'). Only then do they see, read-only, exactly what the Team Portal shows them:
-- their own dates, role, venue, pay and shared job sheets. Never the business's clients, prices or other members.
-- Free on every plan. Safe to re-run.
-- ============================================================

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS member_app_sharing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS member_app_status TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS member_app_user_id UUID;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS member_app_responded_at TIMESTAMPTZ;
DO $$ BEGIN
  ALTER TABLE team_members ADD CONSTRAINT team_members_member_app_status_chk CHECK (member_app_status IS NULL OR member_app_status IN ('accepted', 'declined'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS team_members_member_app_email_idx ON team_members (lower(trim(email))) WHERE member_app_sharing;
CREATE INDEX IF NOT EXISTS team_members_member_app_user_idx ON team_members (member_app_user_id) WHERE member_app_status = 'accepted';

-- Only the team member can say yes or no (through respond_member_app_link below). The business can switch sharing on
-- or off and can "ask again" (clear the answer), but can never mark someone as having accepted.
-- Changing the member's email clears the answer, so a new address is always asked afresh.
CREATE OR REPLACE FUNCTION guard_member_app_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_trusted BOOLEAN := coalesce(current_setting('kramasha.member_link', true), '') = '1'
    OR coalesce(auth.role(), '') = 'service_role';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_trusted THEN
      NEW.member_app_status := NULL;
      NEW.member_app_user_id := NULL;
      NEW.member_app_responded_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF lower(trim(coalesce(NEW.email, ''))) IS DISTINCT FROM lower(trim(coalesce(OLD.email, ''))) THEN
    NEW.member_app_status := NULL;
    NEW.member_app_user_id := NULL;
    NEW.member_app_responded_at := NULL;
    RETURN NEW;
  END IF;

  IF NOT v_trusted THEN
    -- "Ask again": the business may clear the answer, nothing else.
    IF NEW.member_app_status IS NULL AND NEW.member_app_user_id IS NULL THEN
      NEW.member_app_responded_at := NULL;
    ELSE
      NEW.member_app_status := OLD.member_app_status;
      NEW.member_app_user_id := OLD.member_app_user_id;
      NEW.member_app_responded_at := OLD.member_app_responded_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS team_members_guard_member_app_link ON team_members;
CREATE TRIGGER team_members_guard_member_app_link
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION guard_member_app_link();

-- The signed-in person's email, only once they have verified it (so nobody can claim someone else's address).
CREATE OR REPLACE FUNCTION _my_verified_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $fn$
  SELECT lower(trim(u.email)) FROM auth.users u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL AND coalesce(u.email, '') <> ''
  LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION _my_verified_email() FROM PUBLIC, anon, authenticated;

-- Same data the Team Portal shows (get_team_portal_data, 0075), for one team member. Internal only.
CREATE OR REPLACE FUNCTION _team_member_payload(p_team_member_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_member RECORD;
  v_workspace RECORD;
  v_currency TEXT DEFAULT 'INR';
  v_now TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD');
  v_team_asgns JSON;
  v_svc_asgns JSON;
  v_transactions JSON;
  v_events JSON;
  v_job_sheets JSON;
  v_total_earnings NUMERIC DEFAULT 0;
  v_total_paid NUMERIC DEFAULT 0;
  v_remaining NUMERIC DEFAULT 0;
BEGIN
  -- Only called by get_my_outside_work, which already checked the link and consent.
  SELECT id, workspace_id, name, email, phone, profession
  INTO v_member
  FROM team_members
  WHERE id = p_team_member_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Workspace (Added date_format, number_format)
  SELECT name, logo, phone, email, currency, date_format, number_format INTO v_workspace
  FROM workspaces WHERE id = v_member.workspace_id LIMIT 1;

  v_currency := COALESCE(v_workspace.currency, 'INR');

  -- Team assignments for this member (active)
  SELECT COALESCE(json_agg(json_build_object(
    'id', a.id, 'type', 'team', 'event_id', a.event_id,
    'assignment_status', a.assignment_status,
    'role_name', COALESCE(a.role_name_snapshot, ''),
    'agreed_rate', COALESCE(a.agreed_rate, 0),
    'rate_type', COALESCE(a.rate_type, 'Per Event'),
    'booking_start_date', a.booking_start_date,
    'booking_end_date', a.booking_end_date,
    'working_dates', a.working_dates
  )), '[]'::json) INTO v_team_asgns
  FROM event_team_assignments a
  WHERE a.workspace_id = v_member.workspace_id
    AND a.team_member_id = v_member.id
    AND a.assignment_status <> 'removed';

  -- Service assignments where this member is the provider (active)
  SELECT COALESCE(json_agg(json_build_object(
    'id', a.id, 'type', 'service', 'event_id', a.event_id,
    'assignment_status', a.assignment_status,
    'role_name', COALESCE(a.service_name_snapshot, ''),
    'agreed_rate', COALESCE(a.agreed_rate, 0),
    'rate_type', COALESCE(a.rate_type, 'Fixed')
  )), '[]'::json) INTO v_svc_asgns
  FROM event_service_assignments a
  WHERE a.workspace_id = v_member.workspace_id
    AND a.provider_id = v_member.id
    AND a.assignment_status <> 'removed';

  -- Payments to this member (active): their team payments, plus payments for services they provide (those are
  -- stored as BUSINESS_EXPENSE linked to the service assignment, with no team_member_id). Each carries its project
  -- (event_id) and what it paid for (kind + assignment id), so the portal can show paid / due per project.
  SELECT COALESCE(json_agg(json_build_object(
    'id', t.id, 'amount', COALESCE(t.amount, 0),
    'payment_method', t.payment_method,
    'transaction_date', t.transaction_date,
    'reference_number', t.reference_number,
    'notes', t.notes,
    'event_id', t.event_id,
    'kind', CASE WHEN t.transaction_type = 'TEAM_PAYMENT' THEN 'team' ELSE 'service' END,
    'assignment_id', COALESCE(t.team_assignment_id, t.service_assignment_id)
  ) ORDER BY t.transaction_date DESC), '[]'::json) INTO v_transactions
  FROM financial_transactions t
  WHERE t.workspace_id = v_member.workspace_id
    AND t.status = 'ACTIVE'
    AND (
      (t.transaction_type = 'TEAM_PAYMENT' AND t.team_member_id = v_member.id)
      OR t.service_assignment_id IN (
        SELECT id FROM event_service_assignments
        WHERE workspace_id = v_member.workspace_id AND provider_id = v_member.id AND assignment_status <> 'removed'
      )
    );

  -- All related events
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id, 'title', e.title, 'event_type', e.event_type,
    'start_date', e.start_date, 'end_date', e.end_date,
    'venue', e.venue, 'status', e.status
  )), '[]'::json) INTO v_events
  FROM events e
  WHERE e.workspace_id = v_member.workspace_id
    AND e.id IN (
      SELECT event_id FROM event_team_assignments
      WHERE team_member_id = v_member.id AND assignment_status <> 'removed'
      UNION
      SELECT event_id FROM event_service_assignments
      WHERE provider_id = v_member.id AND assignment_status <> 'removed'
    );

  -- Job sheets with show_job_sheet + public link enabled (for token exposure)
  SELECT COALESCE(json_agg(json_build_object(
    'event_id', js.event_id, 'public_token', js.public_token
  )), '[]'::json) INTO v_job_sheets
  FROM job_sheets js
  WHERE js.workspace_id = v_member.workspace_id
    AND js.show_job_sheet = true
    AND js.public_link_enabled = true
    AND js.public_token IS NOT NULL
    AND js.event_id IN (
      SELECT event_id FROM event_team_assignments
      WHERE team_member_id = v_member.id AND assignment_status <> 'removed'
      UNION
      SELECT event_id FROM event_service_assignments
      WHERE provider_id = v_member.id AND assignment_status <> 'removed'
    );

  -- Totals (cast to jsonb so the || concatenation operator works)
  SELECT COALESCE(sum(COALESCE((j->>'agreed_rate')::numeric, 0)), 0) INTO v_total_earnings
  FROM jsonb_array_elements(
    to_jsonb(v_team_asgns) || to_jsonb(v_svc_asgns)
  ) AS j;

  SELECT COALESCE(sum(COALESCE((j->>'amount')::numeric, 0)), 0) INTO v_total_paid
  FROM json_array_elements(v_transactions) AS j;

  v_remaining := GREATEST(0, round(v_total_earnings - v_total_paid, 2));

  RETURN json_build_object(
    'auto_linked', false,
    'member', json_build_object(
      'id', v_member.id, 'name', v_member.name,
      'email', COALESCE(v_member.email, ''), 'phone', COALESCE(v_member.phone, ''),
      'profession', COALESCE(v_member.profession, '')
    ),
    'workspace', json_build_object(
      'id', v_member.workspace_id, 'name', COALESCE(v_workspace.name, ''),
      'logo', COALESCE(v_workspace.logo, ''),
      'phone', COALESCE(v_workspace.phone, ''),
      'email', COALESCE(v_workspace.email, ''),
      'currency', v_currency,
      'date_format', v_workspace.date_format,
      'number_format', v_workspace.number_format
    ),
    'team_assignments', v_team_asgns,
    'service_assignments', v_svc_asgns,
    'events', v_events,
    'job_sheets', v_job_sheets,
    'transactions', v_transactions,
    'summary', json_build_object(
      'totalEarnings', round(v_total_earnings, 2),
      'totalPaid', round(v_total_paid, 2),
      'remaining', v_remaining
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION _team_member_payload(UUID) FROM PUBLIC, anon, authenticated;

-- Businesses that switched sharing on for my verified email (not my own workspaces), with my answer so far.
CREATE OR REPLACE FUNCTION get_member_app_invites()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $fn$
DECLARE
  v_email TEXT := _my_verified_email();
BEGIN
  IF auth.uid() IS NULL OR v_email IS NULL THEN RETURN '[]'::json; END IF;
  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'member_id', tm.id, 'member_name', tm.name, 'status', tm.member_app_status,
      'workspace_id', w.id, 'workspace_name', COALESCE(w.name, ''), 'workspace_logo', COALESCE(w.logo, '')
    ) ORDER BY w.name)
    FROM team_members tm
    JOIN workspaces w ON w.id = tm.workspace_id
    WHERE tm.member_app_sharing
      AND COALESCE(tm.status::text, 'active') = 'active'
      AND lower(trim(tm.email)) = v_email
      AND (tm.member_app_status IS NULL OR tm.member_app_status = 'declined' OR tm.member_app_user_id = auth.uid())
      AND NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = tm.workspace_id AND wm.user_id = auth.uid() AND wm.status = 'active')
  ), '[]'::json);
END;
$fn$;

-- My yes / no for one business. Yes needs the business's switch to be on; no (or "stop showing") always works.
CREATE OR REPLACE FUNCTION respond_member_app_link(p_member_id UUID, p_accept BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $fn$
DECLARE
  v_email TEXT := _my_verified_email();
  v_row team_members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_email IS NULL THEN
    RETURN json_build_object('error', 'Please verify your email first.');
  END IF;
  SELECT * INTO v_row FROM team_members WHERE id = p_member_id LIMIT 1;
  IF NOT FOUND OR lower(trim(coalesce(v_row.email, ''))) <> v_email THEN
    RETURN json_build_object('error', 'This invitation is not for your account.');
  END IF;
  IF p_accept AND NOT v_row.member_app_sharing THEN
    RETURN json_build_object('error', 'This business has stopped sharing their bookings.');
  END IF;
  PERFORM set_config('kramasha.member_link', '1', true);
  UPDATE team_members
     SET member_app_status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
         member_app_user_id = CASE WHEN p_accept THEN auth.uid() ELSE NULL END,
         member_app_responded_at = now()
   WHERE id = p_member_id;
  PERFORM set_config('kramasha.member_link', '', true);
  RETURN json_build_object('ok', true);
END;
$fn$;

-- Everything I accepted: one Team-Portal payload per business, while the business keeps sharing on.
CREATE OR REPLACE FUNCTION get_my_outside_work()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth, extensions
AS $fn$
DECLARE
  v_email TEXT := _my_verified_email();
BEGIN
  IF auth.uid() IS NULL OR v_email IS NULL THEN RETURN '[]'::json; END IF;
  RETURN COALESCE((
    SELECT json_agg(p.payload)
    FROM (
      SELECT _team_member_payload(tm.id) AS payload
      FROM team_members tm
      WHERE tm.member_app_sharing
        AND tm.member_app_status = 'accepted'
        AND tm.member_app_user_id = auth.uid()
        AND COALESCE(tm.status::text, 'active') = 'active'
        AND lower(trim(tm.email)) = v_email
        AND NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = tm.workspace_id AND wm.user_id = auth.uid() AND wm.status = 'active')
    ) p
    WHERE p.payload IS NOT NULL
  ), '[]'::json);
END;
$fn$;

REVOKE ALL ON FUNCTION get_member_app_invites() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION respond_member_app_link(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_my_outside_work() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_member_app_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION respond_member_app_link(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_outside_work() TO authenticated;
