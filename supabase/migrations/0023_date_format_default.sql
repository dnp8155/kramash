-- ============================================================
-- 0023 — Default new workspaces to "DD MMM YYYY" date format
-- Preferences now offers "DD MMM YYYY" as the default/first option (see
-- src/components/settings/ProfileWorkspaceSection.jsx). Must run AFTER
-- 0017_date_format_enum_fix.sql, which adds "DD MMM YYYY" to the
-- date_format enum — this only changes the column default for future
-- inserts, it does not touch any workspace's already-saved value.
-- ============================================================

ALTER TABLE workspaces ALTER COLUMN date_format SET DEFAULT 'DD MMM YYYY';
