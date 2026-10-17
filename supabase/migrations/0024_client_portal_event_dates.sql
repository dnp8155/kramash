-- ============================================================
-- 0024 — Client Portal "Your Projects": include event_dates
-- The Client Portal only showed start_date/end_date, so "Your Projects"
-- could only render a start–end range even for events booked on specific,
-- non-consecutive dates. Adds the event's actual selected event_dates
-- array so the frontend can render one chip per selected date instead.
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

  -- Events (added event_dates for chip-per-selected-date display)
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id, 'title', e.title, 'event_type', e.event_type,
    'start_date', e.start_date, 'end_date', e.end_date,
    'event_dates', e.event_dates,
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
