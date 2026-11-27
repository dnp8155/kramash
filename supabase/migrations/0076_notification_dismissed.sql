-- ============================================================
-- 0076 — Cleared notifications stay cleared
--
-- "Clear" in the bell used to DELETE the row. Reminders are made only once because their row (dedupe_key) exists,
-- so a deleted "Payment overdue" / "Pro plan expired" / lead follow-up was made again on the next scan, with a new push.
-- Now "Clear" only hides the row (dismissed = true, read = true): it stays as the record that the reminder was sent.
-- The bell shows only rows with dismissed = false.
--
-- Safe to re-run. The app keeps working before this is run (it falls back to deleting, as before).
-- ============================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissed BOOLEAN NOT NULL DEFAULT FALSE;

-- The bell's list: this user's visible notifications in a workspace, newest first.
CREATE INDEX IF NOT EXISTS idx_notifications_user_ws_visible
  ON notifications (user_id, workspace_id, created_at DESC)
  WHERE dismissed = FALSE;
