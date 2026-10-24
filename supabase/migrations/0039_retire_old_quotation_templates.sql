-- ============================================================
-- 0039 — Gold Premium and Navy Gold quotation templates are retired
-- Quotations that used them now use Modern Style (template id black_premium), so every quotation has a template
-- that still exists. Safe to re-run.
-- ============================================================
UPDATE quotations SET template_id = 'black_premium' WHERE template_id IN ('gold_premium', 'navy_gold');
ALTER TABLE quotations ALTER COLUMN template_id SET DEFAULT 'black_premium';
