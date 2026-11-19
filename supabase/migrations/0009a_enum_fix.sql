-- ============================================================
-- 0009a — Fix: Add missing plan_limit_key enum values
-- Run this FIRST, separately, before 0009b
-- ============================================================

ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'client_portal_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'team_portal_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'excel_csv_export_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'event_display_customization_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'quotation_logo_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'max_leads';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'notifications_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'link_sharing_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'advanced_theme_enabled';
ALTER TYPE plan_limit_key ADD VALUE IF NOT EXISTS 'quotation_enabled';
-- Fix: Add 'Pending' to event_status enum (Base44 data has 'Pending' status)
ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'Pending';
