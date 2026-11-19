-- ============================================================
-- 0017 — Fix: Add missing date_format enum value.
-- Preferences now offers "DD MMM YYYY" (e.g. "31 Dec 2026") as an option
-- and default, but the date_format enum only had DD/MM/YYYY, MM/DD/YYYY,
-- and YYYY-MM-DD — saving "DD MMM YYYY" from Preferences failed with
-- "invalid input value for enum date_format". This adds the missing value.
-- ============================================================

ALTER TYPE date_format ADD VALUE IF NOT EXISTS 'DD MMM YYYY';
