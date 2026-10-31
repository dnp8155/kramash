-- ============================================================
-- 0021 — Update CRUD Notifications to respect user preferences
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
  v_prefs JSONB;
  v_allowed BOOLEAN;
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
      SELECT notification_preferences INTO v_prefs FROM profiles WHERE id = v_member.user_id;
      v_prefs := COALESCE(v_prefs, '{"in_app":true,"push":true,"email":true,"events":true,"quotations":true,"invoices":true}'::jsonb);

      v_allowed := COALESCE((v_prefs->>'in_app')::boolean, true);
      IF v_allowed THEN
        IF v_entity_type = 'events' AND NOT COALESCE((v_prefs->>'events')::boolean, true) THEN
          v_allowed := false;
        ELSIF v_entity_type = 'quotations' AND NOT COALESCE((v_prefs->>'quotations')::boolean, true) THEN
          v_allowed := false;
        ELSIF v_entity_type IN ('invoices', 'financial_transactions') AND NOT COALESCE((v_prefs->>'invoices')::boolean, true) THEN
          v_allowed := false;
        END IF;
      END IF;

      IF v_allowed THEN
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = v_member.user_id
            AND related_entity_id = v_entity_id
            AND type = 'general'
            AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
          INSERT INTO notifications
            (workspace_id, user_id, type, title, message, related_entity_type, related_entity_id, read)
          VALUES
            (v_workspace_id, v_member.user_id, 'general', v_title, v_message, v_entity_type, v_entity_id, false);
        END IF;
      END IF;
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
      SELECT notification_preferences INTO v_prefs FROM profiles WHERE id = v_member.user_id;
      v_prefs := COALESCE(v_prefs, '{"in_app":true,"push":true,"email":true,"events":true,"quotations":true,"invoices":true}'::jsonb);

      v_allowed := COALESCE((v_prefs->>'in_app')::boolean, true);
      IF v_allowed THEN
        IF v_entity_type = 'events' AND NOT COALESCE((v_prefs->>'events')::boolean, true) THEN
          v_allowed := false;
        ELSIF v_entity_type = 'quotations' AND NOT COALESCE((v_prefs->>'quotations')::boolean, true) THEN
          v_allowed := false;
        ELSIF v_entity_type IN ('invoices', 'financial_transactions') AND NOT COALESCE((v_prefs->>'invoices')::boolean, true) THEN
          v_allowed := false;
        END IF;
      END IF;

      IF v_allowed THEN
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = v_member.user_id
            AND related_entity_id = v_entity_id
            AND type = 'general'
            AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
          INSERT INTO notifications
            (workspace_id, user_id, type, title, message, related_entity_type, related_entity_id, read)
          VALUES
            (v_workspace_id, v_member.user_id, 'general', v_title, v_message, v_entity_type, v_entity_id, false);
        END IF;
      END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
