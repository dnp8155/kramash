-- ============================================================
-- 0055 — Message log: every email / WhatsApp message sent to a client from Kramasha
--
-- One row per message. Shown on the event's Progress tab and (later) a Messages page.
--   channel: email | whatsapp
--   status:  shared (WhatsApp opened with the text ready) | sent | delivered | failed
--   opened_at / clicked_at / replied_at are filled by the email tracking functions (pixel, link, reply).
--   tracking_token is the public id used in those tracking links.
-- Same privacy rule as leads / storage: only the user who created a row can see or change it.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT,
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'shared',
  error TEXT,
  provider_message_id TEXT,
  tracking_token UUID NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  click_count INT NOT NULL DEFAULT 0,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

CREATE INDEX IF NOT EXISTS idx_message_log_workspace ON message_log (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_log_event ON message_log (event_id);
CREATE INDEX IF NOT EXISTS idx_message_log_client ON message_log (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS message_log_tracking_token_uidx ON message_log (tracking_token);

DROP TRIGGER IF EXISTS message_log_updated_at ON message_log;
CREATE TRIGGER message_log_updated_at BEFORE UPDATE ON message_log FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_log_read ON message_log;
DROP POLICY IF EXISTS message_log_insert ON message_log;
DROP POLICY IF EXISTS message_log_update ON message_log;
DROP POLICY IF EXISTS message_log_delete ON message_log;
CREATE POLICY message_log_read ON message_log FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY message_log_insert ON message_log FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY message_log_update ON message_log FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY message_log_delete ON message_log FOR DELETE USING (created_by_id = auth.uid());
