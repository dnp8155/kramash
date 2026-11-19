-- ============================================================
-- 0075 — Team portal: payments per project
-- get_team_portal_data now returns, for every payment, its project (event_id), what it paid for (kind: team /
-- service) and the assignment id — so the Team Portal can show "Paid / Due" per project, name the project in
-- Payment History and on the receipt.
-- It also includes payments for SERVICES the member provides. Those are stored as BUSINESS_EXPENSE linked to the
-- service assignment (no team_member_id), so before this a service provider saw none of their payments and their
-- "Total Paid / Remaining" ignored them.
-- Same checks as before: valid portal session only, this member's own payments only. Nothing stored changes.
-- Safe to re-run (CREATE OR REPLACE).
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

GRANT EXECUTE ON FUNCTION get_team_portal_data(TEXT, UUID) TO anon, authenticated;
