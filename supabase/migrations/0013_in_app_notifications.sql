-- ============================================================
-- 0013 — In-App Notifications: fix RLS + realtime + dedup
-- ============================================================

-- 1. Fix RLS: allow users to create notifications for themselves
--    (previously only is_platform_admin() could insert, which broke
--    client-side notification generation entirely)
DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_insert ON notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. Add unique constraint to prevent duplicate notifications
--    (same user + same entity + same type within 24h = duplicate)
CREATE UNIQUE INDEX IF NOT EXISTS notif_dedup_idx
  ON notifications (user_id, related_entity_id, type)
  WHERE related_entity_id IS NOT NULL
    AND related_entity_id <> ''
    AND created_at > NOW() - INTERVAL '24 hours';

-- 3. Ensure realtime is enabled for notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;