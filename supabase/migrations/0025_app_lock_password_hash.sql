-- ============================================================
-- 0025 — Fix: App Lock is completely broken without this column.
-- src/components/settings/SecuritySection.jsx writes app_lock_password_hash
-- when enabling/disabling/changing the App Lock password, and
-- src/components/security/AppLockScreen.jsx reads it back to verify the
-- unlock password — but the profiles table never had this column, so every
-- attempt to enable App Lock fails with "column does not exist".
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_lock_password_hash TEXT;
