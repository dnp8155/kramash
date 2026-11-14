-- ============================================================
-- 0027 — Notifications: store related dates separately from message text.
-- generateNotifications() used to bake raw "YYYY-MM-DD" strings straight
-- into the notification's message sentence (ignoring the workspace's Date
-- Format preference entirely, and never showing more than one date even for
-- multi-date events). This column lets the frontend render the actual
-- relevant date(s) as small chips, formatted per-preference, separately
-- from a plain narrative message.
-- ============================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_dates DATE[] DEFAULT '{}';
