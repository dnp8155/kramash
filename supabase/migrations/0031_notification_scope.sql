-- ============================================================
-- 0031 — Notifications: keep them inside the workspace + remove email
-- Run this in Supabase SQL Editor.
--
-- 1. Email notifications are gone: the "email" preference key is removed from every profile
--    and from the default.
-- 2. Reading/updating/deleting a notification now also requires the user to still belong to
--    that notification's workspace (before, only user_id was checked, so someone removed from
--    a workspace could still read its old notifications).
-- 3. Notifications are for the workspace OWNER only. Nothing is sent to other members:
--    the "created / deleted" notices, reminders and plan notices all go to the owner, and the
--    person who made a change is never notified about their own action.
-- ============================================================

-- 1. Email preference removal
UPDATE profiles SET notification_preferences = notification_preferences - 'email'
WHERE notification_preferences ? 'email';

ALTER TABLE profiles ALTER COLUMN notification_preferences
  SET DEFAULT '{"in_app":true,"push":true,"events":true,"quotations":true,"invoices":true}'::jsonb;

-- 2. RLS: own notifications AND still a member of the workspace
DROP POLICY IF EXISTS notif_read ON notifications;
DROP POLICY IF EXISTS notif_update ON notifications;
DROP POLICY IF EXISTS notif_delete ON notifications;

CREATE POLICY notif_read ON notifications FOR SELECT
  USING (user_id = auth.uid() AND (workspace_id IS NULL OR workspace_id = ANY (user_workspace_ids())));
CREATE POLICY notif_update ON notifications FOR UPDATE
  USING (user_id = auth.uid() AND (workspace_id IS NULL OR workspace_id = ANY (user_workspace_ids())));
CREATE POLICY notif_delete ON notifications FOR DELETE
  USING (user_id = auth.uid() AND (workspace_id IS NULL OR workspace_id = ANY (user_workspace_ids())));

-- 3. Role-aware audience for created / deleted notices
CREATE OR REPLACE FUNCTION notify_workspace_crud()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_entity_type TEXT;
  v_entity_id TEXT;
  v_entity_name TEXT;
  v_human_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_current_user UUID;
  v_record JSONB;
  v_member RECORD;
  v_prefs JSONB;
  v_allowed BOOLEAN;
BEGIN
  v_entity_type := TG_TABLE_NAME;
  v_current_user := auth.uid();

  IF TG_OP = 'INSERT' THEN v_record := to_jsonb(NEW); ELSE v_record := to_jsonb(OLD); END IF;

  v_workspace_id := (v_record->>'workspace_id')::UUID;
  IF v_workspace_id IS NULL THEN RETURN NULL; END IF;
  v_entity_id := v_record->>'id';

  v_human_type := CASE v_entity_type
    WHEN 'events'                 THEN 'Event'
    WHEN 'clients'                THEN 'Client'
    WHEN 'leads'                  THEN 'Lead'
    WHEN 'quotations'             THEN 'Quotation'
    WHEN 'invoices'               THEN 'Invoice'
    WHEN 'team_members'           THEN 'Team Member'
    WHEN 'services'               THEN 'Service'
    WHEN 'financial_transactions' THEN 'Transaction'
    WHEN 'payment_milestones'     THEN 'Payment Milestone'
    WHEN 'expense_categories'     THEN 'Expense Category'
    WHEN 'team_block_dates'       THEN 'Block Date'
    WHEN 'job_sheets'             THEN 'Job Sheet'
    WHEN 'team_roles'             THEN 'Team Role'
    WHEN 'service_providers'      THEN 'Service Provider'
    ELSE v_entity_type
  END;

  v_entity_name := COALESCE(
    v_record->>'name', v_record->>'title', v_record->>'quotation_number', v_record->>'invoice_number',
    v_record->>'project_title', v_record->>'fy_id',
    v_human_type || ' ' || LEFT(COALESCE(v_entity_id, ''), 8)
  );

  IF TG_OP = 'INSERT' THEN
    v_title := v_human_type || ' created';
    v_message := '"' || v_entity_name || '" has been added';
  ELSE
    v_title := v_human_type || ' deleted';
    v_message := '"' || v_entity_name || '" has been removed';
  END IF;

  -- Audience: the workspace owner only (and never the person who made the change)
  FOR v_member IN
    SELECT w.owner_user_id AS user_id
    FROM workspaces w
    WHERE w.id = v_workspace_id
      AND w.owner_user_id IS NOT NULL
      AND w.owner_user_id IS DISTINCT FROM v_current_user
  LOOP
    SELECT notification_preferences INTO v_prefs FROM profiles WHERE id = v_member.user_id;
    v_prefs := COALESCE(v_prefs, '{"in_app":true,"push":true,"events":true,"quotations":true,"invoices":true}'::jsonb);

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

    IF v_allowed AND NOT EXISTS (
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
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
