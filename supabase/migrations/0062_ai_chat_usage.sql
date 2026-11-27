-- ============================================================
-- 0062 — AI assistant usage: one row per user per day, so agentChat can enforce a daily message cap
-- (the Gemini free tier has a shared quota). Written only by the agentChat Edge Function (service role).
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_usage (
  user_id    UUID NOT NULL,
  usage_date DATE NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;
-- No policies: the browser can't read or write it; the service role bypasses RLS.

-- Counts one message and returns the new total for today, in a single atomic statement.
CREATE OR REPLACE FUNCTION bump_ai_chat_usage(p_user_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO ai_chat_usage (user_id, usage_date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE SET count = ai_chat_usage.count + 1
  RETURNING count;
$$;

REVOKE ALL ON FUNCTION bump_ai_chat_usage(UUID, DATE) FROM PUBLIC, anon, authenticated;
