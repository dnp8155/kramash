-- ============================================================
-- 0061 — Day plan: an optional title for each date of an event or project (e.g. "Haldi", "Reception").
-- Left empty by default; the screen falls back to the title given in the accepted quotation for that date.
-- ============================================================

ALTER TABLE event_day_assignments
  ADD COLUMN IF NOT EXISTS title TEXT;
