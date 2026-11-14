-- ============================================================
-- 0066 — Optional timing for an event or project (start and end time of day, IST). Both are left empty by default.
-- The event-day reminder (Preferences → Notifications) mentions the start time when one is set.
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

NOTIFY pgrst, 'reload schema';
