-- ============================================================
-- 0010 — Drop trigger & FK to allow auth user creation
-- Run this in Supabase SQL Editor BEFORE creating users
-- ============================================================

-- Drop the trigger that auto-creates profiles (it's failing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop the FK constraint on profiles (allows importing Base44 user IDs)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_key;

-- Verify
SELECT 'Trigger dropped, FK dropped — ready for user creation' AS status;