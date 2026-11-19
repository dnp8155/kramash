-- ============================================================
-- 0054 — One notification per reminder, even when two scans run at once
-- ============================================================
-- generateNotifications runs from the hourly cron AND every time the app is opened (possibly on several
-- devices/tabs). Both read "what already exists" first and then insert, so two runs at the same moment
-- could each create the same reminder and push it twice.
--
-- Each reminder now carries a dedupe_key and the database refuses a second row with the same key, so only
-- the run that actually inserted it goes on to send the push. Rows without a key (everything else) are
-- unaffected: NULLs never collide in a unique index.
-- Deploy this BEFORE the new generateNotifications (the function falls back to a plain insert if it is missing).
-- ============================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_key_uidx
  ON notifications (workspace_id, user_id, dedupe_key);
