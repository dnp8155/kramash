-- ============================================================
-- 0028 — Align Free/Pro limits and Pro pricing with the plan spec
--
-- FREE: 5 events, 3 team members, 5 services, 50 leads; Pro-only flags off.
-- PRO : unlimited events/services/leads, 50 team members, all flags on.
-- Pricing (PRO): 219/month, 1099/6 months, 1999/year.
-- Flags are stored as 'true'/'false' (the app also accepts '1'/'0').
-- Safe to re-run.
-- Requires the plan_limit_key enum values added in 0009a.
-- ============================================================

DELETE FROM plan_limits
WHERE plan_id IN (SELECT id FROM plans WHERE code IN ('FREE', 'PRO'))
  AND limit_key::text IN (
    'max_events', 'max_team_members', 'max_services', 'max_leads',
    'reminders_enabled', 'notifications_enabled', 'excel_csv_export_enabled',
    'link_sharing_enabled', 'client_portal_enabled', 'team_portal_enabled',
    'advanced_theme_enabled', 'event_display_customization_enabled', 'quotation_logo_enabled'
  );

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, v.k::plan_limit_key, v.val, true
FROM plans p
JOIN (VALUES
  ('FREE', 'max_events', '5'),
  ('FREE', 'max_team_members', '3'),
  ('FREE', 'max_services', '5'),
  ('FREE', 'max_leads', '50'),
  ('FREE', 'reminders_enabled', 'true'),
  ('FREE', 'notifications_enabled', 'false'),
  ('FREE', 'excel_csv_export_enabled', 'false'),
  ('FREE', 'link_sharing_enabled', 'false'),
  ('FREE', 'client_portal_enabled', 'false'),
  ('FREE', 'team_portal_enabled', 'false'),
  ('FREE', 'advanced_theme_enabled', 'false'),
  ('FREE', 'event_display_customization_enabled', 'false'),
  ('FREE', 'quotation_logo_enabled', 'false'),
  ('PRO', 'max_events', '999999'),
  ('PRO', 'max_team_members', '50'),
  ('PRO', 'max_services', '999999'),
  ('PRO', 'max_leads', '999999'),
  ('PRO', 'reminders_enabled', 'true'),
  ('PRO', 'notifications_enabled', 'true'),
  ('PRO', 'excel_csv_export_enabled', 'true'),
  ('PRO', 'link_sharing_enabled', 'true'),
  ('PRO', 'client_portal_enabled', 'true'),
  ('PRO', 'team_portal_enabled', 'true'),
  ('PRO', 'advanced_theme_enabled', 'true'),
  ('PRO', 'event_display_customization_enabled', 'true'),
  ('PRO', 'quotation_logo_enabled', 'true')
) AS v(code, k, val) ON v.code = p.code;

-- Pro pricing: exactly three active options.
UPDATE plan_pricings SET is_active = false
WHERE plan_id IN (SELECT id FROM plans WHERE code = 'PRO')
  AND billing_cycle::text NOT IN ('MONTHLY', 'SIX_MONTHS', 'ANNUAL');

UPDATE plan_pricings pp
SET price = v.price, duration_months = v.months, currency = 'INR', is_active = true, sort_order = v.ord
FROM plans p,
     (VALUES ('MONTHLY', 219, 1, 1), ('SIX_MONTHS', 1099, 6, 2), ('ANNUAL', 1999, 12, 3)) AS v(cycle, price, months, ord)
WHERE p.code = 'PRO' AND pp.plan_id = p.id AND pp.billing_cycle::text = v.cycle;

INSERT INTO plan_pricings (plan_id, billing_cycle, price, currency, duration_months, storage_gb, is_active, sort_order)
SELECT p.id, v.cycle::billing_cycle, v.price, 'INR', v.months, 0, true, v.ord
FROM plans p,
     (VALUES ('MONTHLY', 219, 1, 1), ('SIX_MONTHS', 1099, 6, 2), ('ANNUAL', 1999, 12, 3)) AS v(cycle, price, months, ord)
WHERE p.code = 'PRO'
  AND NOT EXISTS (SELECT 1 FROM plan_pricings x WHERE x.plan_id = p.id AND x.billing_cycle::text = v.cycle);
