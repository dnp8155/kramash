-- ============================================================
-- 0026 — Add 'quotation_accepted' notification type.
-- The "Quotations" toggle in Preferences → Notifications had no notification
-- type behind it at all — nothing anywhere ever created one. Adds the enum
-- value signQuotation (supabase/functions/signQuotation) now needs to notify
-- the business owner in-app when a client accepts a quotation.
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'quotation_accepted';
