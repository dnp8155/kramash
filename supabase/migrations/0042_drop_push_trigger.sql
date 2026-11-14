-- ============================================================
-- 0042 — Drop Broken Push Notification DB Trigger
-- ============================================================
-- The trigger trg_push_on_notification on 'notifications' called
-- dispatchPushNotification via pg_net using the anon key. Because
-- dispatchPushNotification requires a signed-in user or service role,
-- the trigger returned 401 and failed.
--
-- Push notifications are now reliably delivered directly by producers
-- (generateNotifications, signQuotation) gated by plan limits and user preferences.
-- ============================================================

DROP TRIGGER IF EXISTS trg_push_on_notification ON notifications;
DROP FUNCTION IF EXISTS notify_push_on_insert();
