-- ============================================================
-- 0069 — Optional holidays & festivals on the Team availability calendar (Preferences → Region Settings).
-- holidays_enabled: off by default. holiday_country: ISO code such as IN or AE; empty means "follow the workspace country".
-- holiday_regional: also show regional festivals and observances, not only public holidays.
-- ============================================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS holidays_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_country TEXT,
  ADD COLUMN IF NOT EXISTS holiday_regional BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
