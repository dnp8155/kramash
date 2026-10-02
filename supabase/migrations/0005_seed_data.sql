-- ============================================================
-- 0005 — Seed Data (Plans, PlanPricings, PlanLimits)
-- Run AFTER 0004_triggers_indexes.sql
-- ============================================================

-- ============================================================
-- Plans
-- ============================================================
INSERT INTO plans (code, name, description, is_active, sort_order) VALUES
  ('FREE', 'Free Plan', 'Basic features for getting started', true, 1),
  ('PRO', 'Pro Plan', 'Advanced features for growing businesses', true, 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Plan Pricings
-- ============================================================
INSERT INTO plan_pricings (plan_id, billing_cycle, price, currency, duration_months, storage_gb, is_active, sort_order)
SELECT p.id, 'MONTHLY', 0, 'INR', 1, 0, true, 1
FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_pricings (plan_id, billing_cycle, price, currency, duration_months, storage_gb, is_active, sort_order)
SELECT p.id, 'MONTHLY', 999, 'INR', 1, 5, true, 1
FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_pricings (plan_id, billing_cycle, price, currency, duration_months, storage_gb, is_active, sort_order)
SELECT p.id, 'SIX_MONTHS', 4999, 'INR', 6, 5, true, 2
FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_pricings (plan_id, billing_cycle, price, currency, duration_months, storage_gb, is_active, sort_order)
SELECT p.id, 'ANNUAL', 8999, 'INR', 12, 10, true, 3
FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Plan Limits — FREE
-- ============================================================
INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_events', '10', true FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_team_members', '5', true FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_services', '10', true FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_storage_gb', '0.5', true FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'pdf_export_enabled', 'false', true FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'reminders_enabled', 'false', true FROM plans p WHERE p.code = 'FREE'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Plan Limits — PRO
-- ============================================================
INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_events', '999', true FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_team_members', '999', true FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_services', '999', true FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'max_storage_gb', '10', true FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'pdf_export_enabled', 'true', true FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;

INSERT INTO plan_limits (plan_id, limit_key, limit_value, enabled)
SELECT p.id, 'reminders_enabled', 'true', true FROM plans p WHERE p.code = 'PRO'
ON CONFLICT DO NOTHING;