-- ============================================================
-- 0018 — Job Sheet: add a switch to show/hide client contact details.
-- Defaults to true so existing job sheets keep showing client name/phone
-- exactly as they do today (no behavior change until someone flips it off).
-- ============================================================

ALTER TABLE job_sheets
  ADD COLUMN IF NOT EXISTS include_client_contact BOOLEAN NOT NULL DEFAULT true;
