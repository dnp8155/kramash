-- ============================================================
-- 0037 — Quotation signing link gets its own on/off switch
--
-- Before: a quotation's /q/<token> link only existed after you enabled the whole Client Project Portal
-- (public_link_enabled), and switching that off did not actually stop /q/<token> working.
-- Now: quotation_link_enabled controls the /q/<token> link on its own, independent of the project portal.
-- Existing quotations keep working: anything that had the portal enabled gets the quotation link enabled too.
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_link_enabled BOOLEAN DEFAULT false;

UPDATE quotations SET quotation_link_enabled = true
WHERE COALESCE(public_link_enabled, false) = true AND COALESCE(quotation_link_enabled, false) = false;
