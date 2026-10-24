-- ============================================================
-- 0030 — Manual final total for quotations and invoices
-- Run this in Supabase SQL Editor.
-- final_total_override: the amount the user typed to match their contract value (NULL = off).
-- adjustment_amount:    final_total_override minus the calculated total (signed), saved so
--                       PDFs / public pages can show it as "Round off / Adjustment".
-- ============================================================

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS final_total_override NUMERIC;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices   ADD COLUMN IF NOT EXISTS final_total_override NUMERIC;
ALTER TABLE invoices   ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC DEFAULT 0;
