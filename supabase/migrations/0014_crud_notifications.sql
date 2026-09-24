-- ============================================================
-- 0014 — CRUD Notifications: auto-notify on CREATE & DELETE
-- ============================================================
-- PostgreSQL triggers that fire AFTER INSERT or DELETE on key
-- business tables, creating an in-app notification for every
-- active workspace member (except the person who made the change).
--
-- Works at the database level — fires regardless of whether the
-- change came from the web client, a mobile client, or an Edge
-- Function. No integration credits required.
-- ============================================================

-- ============================================================
-- Drop the broken dedup index from 0013 — it used NOW() in a
-- partial index predicate, which PostgreSQL rejects (NOW() is
-- STABLE, not IMMUTABLE).  Dedup is handled in application code
-- (notificationService.js checks for existing unread notifications)
-- and in the trigger's exception handler below.
-- ============================================================
DROP INDEX IF EXISTS notif_dedup_idx;

-- ============================================================
-- Generic trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION notify_workspace_crud()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_entity_type TEXT;
  v_entity_id TEXT;
  v_entity_name TEXT;
  v_action TEXT;
  v_human_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_current_user UUID;
  v_record JSONB;
  v_member RECORD;
BEGIN
  v_action := TG_OP;
  v_entity_type := TG_TABLE_NAME;
  v_current_user := auth.uid();

  -- Pick the right record (NEW for INSERT, OLD for DELETE)
  IF TG_OP = 'INSERT' THEN
    v_record := to_jsonb(NEW);
  ELSE
    v_record := to_jsonb(OLD);
  END IF;

  -- workspace_id (all target tables have this column)
  v_workspace_id := (v_record->>'workspace_id')::UUID;
  IF v_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Entity id as text (notifications.related_entity_id is TEXT)
  v_entity_id := v_record->>'id';

  -- Human-readable table label
  v_human_type := CASE v_entity_type
    WHEN 'events'                THEN 'Event'
    WHEN 'clients'               THEN 'Client'
    WHEN 'leads'                 THEN 'Lead'
    WHEN 'quotations'            THEN 'Quotation'
    WHEN 'invoices'              THEN 'Invoice'
    WHEN 'team_members'          THEN 'Team Member'
    WHEN 'services'             THEN 'Service'
    WHEN 'financial_transactions' THEN 'Transaction'
    WHEN 'payment_milestones'    THEN 'Payment Milestone'
    WHEN 'expense_categories'   THEN 'Expense Category'
    WHEN 'team_block_dates'      THEN 'Block Date'
    WHEN 'job_sheets'           THEN 'Job Sheet'
    WHEN 'team_roles'           THEN 'Team Role'
    WHEN 'service_providers'    THEN 'Service Provider'
    ELSE v_entity_type
  END;

  -- Entity display name (try common name columns, fall back to type + short id)
  v_entity_name := COALESCE(
    v_record->>'name',
    v_record->>'title',
    v_record->>'quotation_number',
    v_record->>'invoice_number',
    v_record->>'project_title',
    v_record->>'fy_id',
    v_human_type || ' ' || LEFT(COALESCE(v_entity_id, ''), 8)
  );

  -- Build notification text
  IF v_action = 'INSERT' THEN
    v_title   := v_human_type || ' created';
    v_message := '"' || v_entity_name || '" has been added';
  ELSE
    v_title   := v_human_type || ' deleted';
    v_message := '"' || v_entity_name || '" has been removed';
  END IF;

  -- Notify every active workspace member (skip the person who made the change)
  FOR v_member IN
    SELECT user_id FROM workspace_members
    WHERE workspace_id = v_workspace_id
      AND status = 'active'
      AND user_id IS DISTINCT FROM v_current_user
  LOOP
    BEGIN
      INSERT INTO notifications
        (workspace_id, user_id, type, title, message, related_entity_type, related_entity_id, read)
      VALUES
        (v_workspace_id, v_member.user_id, 'general', v_title, v_message, v_entity_type, v_entity_id, false);
    EXCEPTION WHEN unique_violation THEN
      -- dedup index (0013) blocked a duplicate within 24h — skip silently
      NULL;
    END;
  END LOOP;

  -- Also notify the workspace owner if they are NOT already an active member
  FOR v_member IN
    SELECT w.owner_user_id AS user_id
    FROM workspaces w
    WHERE w.id = v_workspace_id
      AND w.owner_user_id IS DISTINCT FROM v_current_user
      AND w.owner_user_id NOT IN (
        SELECT user_id FROM workspace_members
        WHERE workspace_id = v_workspace_id AND status = 'active'
      )
  LOOP
    BEGIN
      INSERT INTO notifications
        (workspace_id, user_id, type, title, message, related_entity_type, related_entity_id, read)
      VALUES
        (v_workspace_id, v_member.user_id, 'general', v_title, v_message, v_entity_type, v_entity_id, false);
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Attach triggers: AFTER INSERT + AFTER DELETE on each table
-- ============================================================

-- events
DROP TRIGGER IF EXISTS notify_event_insert ON events;
CREATE TRIGGER notify_event_insert AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_event_delete ON events;
CREATE TRIGGER notify_event_delete AFTER DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- clients
DROP TRIGGER IF EXISTS notify_client_insert ON clients;
CREATE TRIGGER notify_client_insert AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_client_delete ON clients;
CREATE TRIGGER notify_client_delete AFTER DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- leads
DROP TRIGGER IF EXISTS notify_lead_insert ON leads;
CREATE TRIGGER notify_lead_insert AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_lead_delete ON leads;
CREATE TRIGGER notify_lead_delete AFTER DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- quotations
DROP TRIGGER IF EXISTS notify_quotation_insert ON quotations;
CREATE TRIGGER notify_quotation_insert AFTER INSERT ON quotations
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_quotation_delete ON quotations;
CREATE TRIGGER notify_quotation_delete AFTER DELETE ON quotations
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- invoices
DROP TRIGGER IF EXISTS notify_invoice_insert ON invoices;
CREATE TRIGGER notify_invoice_insert AFTER INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_invoice_delete ON invoices;
CREATE TRIGGER notify_invoice_delete AFTER DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- team_members
DROP TRIGGER IF EXISTS notify_team_member_insert ON team_members;
CREATE TRIGGER notify_team_member_insert AFTER INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_team_member_delete ON team_members;
CREATE TRIGGER notify_team_member_delete AFTER DELETE ON team_members
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- services
DROP TRIGGER IF EXISTS notify_service_insert ON services;
CREATE TRIGGER notify_service_insert AFTER INSERT ON services
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_service_delete ON services;
CREATE TRIGGER notify_service_delete AFTER DELETE ON services
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- financial_transactions
DROP TRIGGER IF EXISTS notify_transaction_insert ON financial_transactions;
CREATE TRIGGER notify_transaction_insert AFTER INSERT ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_transaction_delete ON financial_transactions;
CREATE TRIGGER notify_transaction_delete AFTER DELETE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- payment_milestones
DROP TRIGGER IF EXISTS notify_milestone_insert ON payment_milestones;
CREATE TRIGGER notify_milestone_insert AFTER INSERT ON payment_milestones
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_milestone_delete ON payment_milestones;
CREATE TRIGGER notify_milestone_delete AFTER DELETE ON payment_milestones
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- expense_categories
DROP TRIGGER IF EXISTS notify_expense_cat_insert ON expense_categories;
CREATE TRIGGER notify_expense_cat_insert AFTER INSERT ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_expense_cat_delete ON expense_categories;
CREATE TRIGGER notify_expense_cat_delete AFTER DELETE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- team_block_dates
DROP TRIGGER IF EXISTS notify_block_date_insert ON team_block_dates;
CREATE TRIGGER notify_block_date_insert AFTER INSERT ON team_block_dates
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_block_date_delete ON team_block_dates;
CREATE TRIGGER notify_block_date_delete AFTER DELETE ON team_block_dates
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- job_sheets
DROP TRIGGER IF EXISTS notify_job_sheet_insert ON job_sheets;
CREATE TRIGGER notify_job_sheet_insert AFTER INSERT ON job_sheets
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_job_sheet_delete ON job_sheets;
CREATE TRIGGER notify_job_sheet_delete AFTER DELETE ON job_sheets
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- team_roles
DROP TRIGGER IF EXISTS notify_team_role_insert ON team_roles;
CREATE TRIGGER notify_team_role_insert AFTER INSERT ON team_roles
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_team_role_delete ON team_roles;
CREATE TRIGGER notify_team_role_delete AFTER DELETE ON team_roles
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- service_providers
DROP TRIGGER IF EXISTS notify_service_provider_insert ON service_providers;
CREATE TRIGGER notify_service_provider_insert AFTER INSERT ON service_providers
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_service_provider_delete ON service_providers;
CREATE TRIGGER notify_service_provider_delete AFTER DELETE ON service_providers
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();

-- financial_years
DROP TRIGGER IF EXISTS notify_fy_insert ON financial_years;
CREATE TRIGGER notify_fy_insert AFTER INSERT ON financial_years
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();
DROP TRIGGER IF EXISTS notify_fy_delete ON financial_years;
CREATE TRIGGER notify_fy_delete AFTER DELETE ON financial_years
  FOR EACH ROW EXECUTE FUNCTION notify_workspace_crud();