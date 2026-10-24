-- ============================================================
-- 0019 — Update Client and Team Portal RPC to include date/number formats
-- Run this in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION get_client_portal_data(p_session_token TEXT, p_client_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_client RECORD;
  v_workspace RECORD;
  v_currency TEXT DEFAULT 'INR';
  v_events JSON;
  v_quotations JSON;
  v_invoices JSON;
  v_transactions JSON;
  v_total_quoted NUMERIC DEFAULT 0;
  v_total_invoiced NUMERIC DEFAULT 0;
  v_total_paid NUMERIC DEFAULT 0;
  v_balance_due NUMERIC DEFAULT 0;
BEGIN
  -- Validate session
  SELECT id, workspace_id, name, email INTO v_client
  FROM clients
  WHERE id = p_client_id
    AND portal_access_token = p_session_token
    AND portal_access_enabled = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Your portal session is no longer active. Please sign in again.');
  END IF;

  -- Workspace (Added date_format, number_format)
  SELECT name, logo, phone, email, currency, date_format, number_format INTO v_workspace
  FROM workspaces WHERE id = v_client.workspace_id LIMIT 1;

  v_currency := COALESCE(v_workspace.currency, 'INR');

  -- Events
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id, 'title', e.title, 'event_type', e.event_type,
    'start_date', e.start_date, 'end_date', e.end_date,
    'venue', e.venue, 'status', e.status,
    'contract_value', COALESCE(e.contract_value, 0)
  ) ORDER BY e.start_date DESC), '[]'::json) INTO v_events
  FROM events e
  WHERE e.workspace_id = v_client.workspace_id AND e.client_id = v_client.id;

  -- Quotations
  SELECT COALESCE(json_agg(json_build_object(
    'id', q.id, 'quotation_number', q.quotation_number,
    'quotation_date', q.quotation_date, 'status', q.status,
    'grand_total', COALESCE(q.grand_total, 0),
    'public_token', q.public_token,
    'public_link_enabled', COALESCE(q.public_link_enabled, false),
    'project_title', q.project_title
  ) ORDER BY q.created_at DESC), '[]'::json) INTO v_quotations
  FROM quotations q
  WHERE q.workspace_id = v_client.workspace_id AND q.client_id = v_client.id;

  -- Invoices
  SELECT COALESCE(json_agg(json_build_object(
    'id', inv.id, 'invoice_number', inv.invoice_number,
    'invoice_date', inv.invoice_date, 'due_date', inv.due_date,
    'status', inv.status, 'grand_total', COALESCE(inv.grand_total, 0),
    'amount_paid', COALESCE(inv.amount_paid, 0),
    'balance_due', COALESCE(inv.balance_due, 0),
    'public_token', inv.public_token,
    'public_link_enabled', COALESCE(inv.public_link_enabled, false)
  ) ORDER BY inv.created_at DESC), '[]'::json) INTO v_invoices
  FROM invoices inv
  WHERE inv.workspace_id = v_client.workspace_id AND inv.client_id = v_client.id;

  -- Transactions (client receipts only, active)
  SELECT COALESCE(json_agg(json_build_object(
    'id', t.id, 'amount', COALESCE(t.amount, 0),
    'payment_method', t.payment_method,
    'transaction_date', t.transaction_date,
    'reference_number', t.reference_number
  ) ORDER BY t.transaction_date DESC), '[]'::json) INTO v_transactions
  FROM financial_transactions t
  WHERE t.workspace_id = v_client.workspace_id
    AND t.client_id = v_client.id
    AND t.transaction_type = 'CLIENT_RECEIPT'
    AND t.status = 'ACTIVE';

  -- Summary
  SELECT COALESCE(sum(CASE WHEN q.status = 'accepted' THEN COALESCE(q.grand_total, 0) ELSE 0 END), 0)
  INTO v_total_quoted
  FROM quotations q
  WHERE q.workspace_id = v_client.workspace_id AND q.client_id = v_client.id;

  SELECT COALESCE(sum(COALESCE(inv.grand_total, 0)), 0)
  INTO v_total_invoiced
  FROM invoices inv
  WHERE inv.workspace_id = v_client.workspace_id AND inv.client_id = v_client.id;

  SELECT COALESCE(sum(COALESCE(t.amount, 0)), 0)
  INTO v_total_paid
  FROM financial_transactions t
  WHERE t.workspace_id = v_client.workspace_id
    AND t.client_id = v_client.id
    AND t.transaction_type = 'CLIENT_RECEIPT'
    AND t.status = 'ACTIVE';

  v_balance_due := GREATEST(0, round(v_total_invoiced - v_total_paid, 2));

  RETURN json_build_object(
    'auto_linked', false,
    'client', json_build_object(
      'id', v_client.id, 'name', v_client.name, 'email', COALESCE(v_client.email, '')
    ),
    'workspace', json_build_object(
      'id', v_client.workspace_id, 'name', COALESCE(v_workspace.name, ''),
      'logo', COALESCE(v_workspace.logo, ''),
      'phone', COALESCE(v_workspace.phone, ''),
      'email', COALESCE(v_workspace.email, ''),
      'currency', v_currency,
      'date_format', v_workspace.date_format,
      'number_format', v_workspace.number_format
    ),
    'summary', json_build_object(
      'totalEvents', json_array_length(v_events),
      'totalQuoted', round(v_total_quoted, 2),
      'totalInvoiced', round(v_total_invoiced, 2),
      'totalPaid', round(v_total_paid, 2),
      'balanceDue', v_balance_due
    ),
    'events', v_events,
    'quotations', v_quotations,
    'invoices', v_invoices,
    'transactions', v_transactions
  );
END;
$$;


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
