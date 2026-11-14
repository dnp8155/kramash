-- ============================================================
-- 0059 — Job Sheet: switch to show/hide the team "sides" (business member types, plus Unassigned).
-- Defaults to true so every job sheet shows sides; flip it off per job sheet in Job Sheet Settings.
-- ============================================================

ALTER TABLE job_sheets
  ADD COLUMN IF NOT EXISTS show_team_sides BOOLEAN NOT NULL DEFAULT true;
