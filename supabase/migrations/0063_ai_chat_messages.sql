-- ============================================================
-- 0063 — AI assistant chat history: each user's conversation per workspace, so it is still there after
-- logging out and in, or on another device. Written by the agentChat Edge Function (service role); the function
-- also deletes anything older than 30 days. Only the user can read their own messages.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  workspace_id UUID NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_messages_user_ws_idx ON ai_chat_messages (user_id, workspace_id, created_at DESC);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_chat_messages_select_own ON ai_chat_messages;
CREATE POLICY ai_chat_messages_select_own ON ai_chat_messages FOR SELECT USING (auth.uid() = user_id);
-- No insert/update/delete policies: only the Edge Function (service role) writes.
