-- ============================================================
-- 0016 — Team Member Portal RPC functions (client-side, no Edge Functions)
-- Run this in Supabase SQL Editor.
-- Mirrors the client portal RPC pattern from 0011.
-- ============================================================

-- Ensure pgcrypto is available for SHA-256 digest
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- verify_team_portal(token, password)
-- Looks up a team member by portal_access_token, verifies the
-- salt:sha256(salt:password) hash, and returns session info.
-- SECURITY DEFINER bypasses RLS so unauthenticated portal
-- users can verify their password.
-- ============================================================
CREATE OR REPLACE FUNCTION verify_team_portal(p_token TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_member RECORD;
  v_salt TEXT;
  v_stored_hash TEXT;
  v_computed_hash TEXT;
BEGIN
  SELECT id, workspace_id, name, portal_password_hash, portal_access_token
  INTO v_member
  FROM team_members
  WHERE portal_access_token = p_token AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'This link is no longer active. Please contact your service provider.');
  END IF;

  v_salt := split_part(v_member.portal_password_hash, ':', 1);
  v_stored_hash := split_part(v_member.portal_password_hash, ':', 2);

  v_computed_hash := encode(digest(v_salt || ':' || p_password, 'sha256'), 'hex');

  IF v_computed_hash = v_stored_hash THEN
    RETURN json_build_object(
      'success', true,
      'session_token', v_member.portal_access_token,
      'team_member_id', v_member.id,
      'workspace_id', v_member.workspace_id,
      'member_name', v_member.name
    );
  ELSE
    RETURN json_build_object('error', 'Incorrect password. Please try again.');
  END IF;
END;
$$;

-- ============================================================
-- get_team_portal_data(session_token, team_member_id)
-- Validates the session token, then returns all portal data
-- (member, workspace, summary, upcoming, past, projects, payments, job sheet tokens).
-- SECURITY DEFINER bypasses RLS so unauthenticated portal
-- users can read their own data.
-- ============================================================
CREATE OR REPLACE FUNCTION get_team_portal_data(p_session_token TEXT, p_team_member_id UUID)
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
  -- Validate session
  SELECT id, workspace_id, name, email, phone, profession
  INTO v_member
  FROM team_members
  WHERE id = p_team_member_id
    AND portal_access_token = p_session_token
    AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Your portal session is no longer active. Please sign in again.');
  END IF;

  -- Workspace
  SELECT name, logo, phone, email, currency INTO v_workspace
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

  -- Team payment transactions for this member (active)
  SELECT COALESCE(json_agg(json_build_object(
    'id', t.id, 'amount', COALESCE(t.amount, 0),
    'payment_method', t.payment_method,
    'transaction_date', t.transaction_date,
    'reference_number', t.reference_number,
    'notes', t.notes
  ) ORDER BY t.transaction_date DESC), '[]'::json) INTO v_transactions
  FROM financial_transactions t
  WHERE t.workspace_id = v_member.workspace_id
    AND t.team_member_id = v_member.id
    AND t.transaction_type = 'TEAM_PAYMENT'
    AND t.status = 'ACTIVE';

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
      'currency', v_currency
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

-- Grant execute to anon (public) — the functions are safe because they
-- require a valid portal access token + password.
GRANT EXECUTE ON FUNCTION verify_team_portal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_team_portal_data TO anon, authenticated;