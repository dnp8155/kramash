-- ============================================================
-- 0049 — PDF export is available on the Free plan
--
-- The Free plan's pdf_export_enabled flag was seeded as 'false', but the app never enforced it (Free users can
-- already export quotation / invoice PDFs). Admin → Plans & Pricing showed it as off, which was misleading.
-- This sets it to on for Free so the data matches what the app does. Safe to re-run.
-- ============================================================

UPDATE plan_limits
SET limit_value = 'true', enabled = true
WHERE limit_key::text = 'pdf_export_enabled'
  AND plan_id IN (SELECT id FROM plans WHERE code = 'FREE');

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'pdf_export_enabled'::plan_limit_key, 'true', true
FROM plans p
WHERE p.code = 'FREE'
  AND NOT EXISTS (
    SELECT 1 FROM plan_limits x WHERE x.plan_id = p.id AND x.limit_key::text = 'pdf_export_enabled'
  );
