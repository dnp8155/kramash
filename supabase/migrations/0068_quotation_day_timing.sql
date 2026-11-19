-- ============================================================
-- 0068 — Quotation: an optional start and end time for each day, kept on that day's lines the same way the
-- "Function / phase title" is. For the business only: the client's quotation page and PDF do not show them.
-- Accepting the quotation copies them to the event's Day plan (only for days that have no time of their own yet).
-- ============================================================

ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS day_start_time TIME,
  ADD COLUMN IF NOT EXISTS day_end_time TIME;

NOTIFY pgrst, 'reload schema';
