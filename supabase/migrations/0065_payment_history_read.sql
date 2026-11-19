-- ============================================================
-- 0065 — Your Plan → Payment history
--
-- Payment rows are created by the createPaymentOrder edge function, which does not set created_by_id, so the old
-- read rule (created_by_id = auth.uid()) hid every payment from the person who made it. Members of a workspace can
-- now read that workspace's own payments (still read-only; only platform admins can change them).
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS spay_read ON subscription_payments;
CREATE POLICY spay_read ON subscription_payments FOR SELECT
  USING (created_by_id = auth.uid() OR workspace_id = ANY(user_workspace_ids()) OR is_platform_admin());
