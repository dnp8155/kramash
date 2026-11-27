-- ============================================================
-- 0058 — Plans & Pricing can now switch "Email Clients from Gmail" on or off per plan
--
-- plan_limits.limit_key is a database list of allowed names, and the Gmail switch (client_email_enabled) was never on
-- it, so the admin Plans page could not hold a row for it. Until now it worked from a built-in rule: off on Free, on for
-- Pro. This adds the name. Nothing changes by itself: with no row, that built-in rule keeps applying.
-- To control it from the Plans page afterwards: Plans & Pricing -> Add on a plan -> "Email Clients from Gmail".
--
-- Run this on its own in the Supabase SQL Editor (a new list value cannot be used in the same run that adds it).
-- Safe to re-run.
-- ============================================================

ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'client_email_enabled';
