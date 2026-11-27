-- ============================================================
-- 0033 — Cron Job to Generate Notifications Automatically
-- ============================================================
-- This script sets up a daily cron job that triggers the
-- 'generateNotifications' Edge Function at 10:00 AM (UTC).
-- 
-- Make sure the pg_cron and pg_net extensions are enabled.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- This will run every hour at the top of the hour.
-- The Edge function itself will check each user's profile and only send 
-- the notification if the current hour matches the user's selected reminder_time.
SELECT cron.schedule(
  'generate-hourly-notifications', 
  '0 * * * *', 
  $$
  SELECT net.http_post(
      url:='https://fyfbpboxdkyxsgjbvqmg.supabase.co/functions/v1/generateNotifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZmJwYm94ZGt5eHNnamJ2cW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTY0NjcsImV4cCI6MjEwNTU3MjQ2N30.11tdMRPoaonSZbS2SAlhDFJbB7c4CPDvXzUgV0HwEx8"}'::jsonb,
      body:='{}'::jsonb
  );
  $$
);
