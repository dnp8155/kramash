-- ============================================================
-- 0032 — Push Notification Webhook Trigger
-- ============================================================
-- This trigger automatically fires a web request to your Edge Function
-- (dispatchPushNotification) whenever a new notification is inserted.
--
-- Note: It requires the 'pg_net' extension to be enabled.
-- Alternatively, you can create this easily via the Supabase Dashboard:
-- Database -> Webhooks -> Create Webhook (Trigger on Insert to 'notifications' table).
-- ============================================================

-- Ensure pg_net is enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
  v_anon_key TEXT;
  v_payload JSONB;
BEGIN
  -- ⚠️ REPLACE THESE WITH YOUR ACTUAL PROJECT URL AND ANON KEY
  -- Or even better, use the Supabase Dashboard Webhooks UI instead of this raw SQL
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/dispatchPushNotification';
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Fallback if settings are not defined in postgresql.conf (you can hardcode them here for testing)
  IF v_url IS NULL OR v_url = '/functions/v1/dispatchPushNotification' THEN
    v_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/dispatchPushNotification';
  END IF;

  IF v_anon_key IS NULL THEN
    v_anon_key := 'YOUR_SUPABASE_ANON_KEY';
  END IF;

  v_payload := jsonb_build_object(
    'userId', NEW.user_id,
    'title', NEW.title,
    'content', NEW.message,
    'data', jsonb_build_object(
      'entity_type', NEW.related_entity_type,
      'entity_id', NEW.related_entity_id
    )
  );

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_push_on_notification ON notifications;

-- Create the trigger on notifications table
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_insert();
