-- ============================================================
-- 0056 — Gmail connection, scheduled messages and automatic reminders
--
-- Run AFTER 0055 (message_log).
--
-- • messaging_accounts: the Gmail account a workspace connected (one per workspace). The refresh token is
--   stored ENCRYPTED. The table has row security on and NO policies, so the browser can never read it; only
--   the Edge Functions (service role) can. The app asks the gmailAccount function for the status instead.
-- • scheduled_messages: a message a person scheduled for later ("send this on 12 Dec at 10:00").
--   Email goes out by itself; WhatsApp cannot, so it becomes a reminder notification to send it.
-- • message_log gets: automated (sent by an automatic rule), rule_key (which rule), dedupe_key (so the
--   same reminder is never sent twice).
-- Automatic rules themselves live in workspaces.display_preferences.message_automation (no table needed).
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS messaging_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  email TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',      -- active | needs_reconnect
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS messaging_accounts_workspace_provider_uidx ON messaging_accounts (workspace_id, provider);
DROP TRIGGER IF EXISTS messaging_accounts_updated_at ON messaging_accounts;
CREATE TRIGGER messaging_accounts_updated_at BEFORE UPDATE ON messaging_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE messaging_accounts ENABLE ROW LEVEL SECURITY;   -- deliberately no policies

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,                       -- email | whatsapp
  template_id TEXT,
  template_name TEXT,
  subject TEXT,                                -- template text with {details}; filled in when it is sent
  body TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | processing | sent | failed | cancelled
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_due ON scheduled_messages (status, send_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_event ON scheduled_messages (event_id);
DROP TRIGGER IF EXISTS scheduled_messages_updated_at ON scheduled_messages;
CREATE TRIGGER scheduled_messages_updated_at BEFORE UPDATE ON scheduled_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduled_messages_read ON scheduled_messages;
DROP POLICY IF EXISTS scheduled_messages_insert ON scheduled_messages;
DROP POLICY IF EXISTS scheduled_messages_update ON scheduled_messages;
DROP POLICY IF EXISTS scheduled_messages_delete ON scheduled_messages;
CREATE POLICY scheduled_messages_read ON scheduled_messages FOR SELECT USING (created_by_id = auth.uid());
CREATE POLICY scheduled_messages_insert ON scheduled_messages FOR INSERT WITH CHECK (created_by_id = auth.uid());
CREATE POLICY scheduled_messages_update ON scheduled_messages FOR UPDATE USING (created_by_id = auth.uid());
CREATE POLICY scheduled_messages_delete ON scheduled_messages FOR DELETE USING (created_by_id = auth.uid());

ALTER TABLE message_log ADD COLUMN IF NOT EXISTS automated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS rule_key TEXT;
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS message_log_dedupe_key_uidx ON message_log (workspace_id, dedupe_key);
