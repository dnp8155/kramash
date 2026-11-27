-- ============================================================
-- 0034 — Let the hourly reminder cron actually authenticate
-- ============================================================
-- 0033 called generateNotifications with the anon key. The function needs a signed-in user (or the
-- cron secret), so every hourly run was rejected with 401 and no reminders were ever generated or pushed.
--
-- Before running this:
--   1. Pick a long random string and store it as the Edge Function secret CRON_SECRET
--        supabase secrets set CRON_SECRET=<your-random-string>
--      then redeploy:  supabase functions deploy generateNotifications
--      (The anon key in Authorization is only there to get past the Edge gateway; CRON_SECRET is what authorises the scan.)
--   2. Replace YOUR_CRON_SECRET below with the same string.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('generate-hourly-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-hourly-notifications');

SELECT cron.schedule(
  'generate-hourly-notifications',
  '0 * * * *',
  $$
  SELECT net.http_post(
      url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/generateNotifications',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true),
        'x-cron-secret', current_setting('app.settings.cron_secret', true)
      ),
      body:='{}'::jsonb,
      timeout_milliseconds:=60000
  );
  $$
);

