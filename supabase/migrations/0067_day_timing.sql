-- ============================================================
-- 0067 — Day plan: an optional start and end time for each date of an event or project.
-- A date without its own time follows the event's start_time / end_time (migration 0066).
-- ============================================================

ALTER TABLE event_day_assignments
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

NOTIFY pgrst, 'reload schema';
