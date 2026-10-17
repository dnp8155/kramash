-- Fix: Pro users (assigned by an admin, or created by edge functions) still saw the Free-plan upgrade banner.
-- The ws_read policy only allowed created_by_id = auth.uid(). Subscriptions inserted with the service role
-- (assignProSubscription, initWorkspaceSubscription, payment webhooks) have created_by_id NULL (auth.uid() is
-- null there), so the workspace owner could not read their own subscription and resolved to FREE.
-- Read access now follows workspace membership, like the rest of the workspace data.
DROP POLICY IF EXISTS ws_read ON workspace_subscriptions;
CREATE POLICY ws_read ON workspace_subscriptions FOR SELECT
  USING (
    workspace_id = ANY(user_workspace_ids())
    OR created_by_id = auth.uid()
    OR is_platform_admin()
  );
