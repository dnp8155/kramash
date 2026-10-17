-- ============================================================
-- 0041 — Admin → Workspaces: only real accounts, with real usage numbers
--
-- Before: the admin list showed every row in `workspaces` (including ones whose owner had been deleted in Supabase
-- Auth) and filled "Usage" and "Storage" with fixed zeros (0E · 0T · 0S, 0 GB), while the workspace page showed the
-- real counts.
-- Now: one admin-only function returns, per workspace, the owner, plan, real counts of events / active team members /
-- active services and real storage used — and leaves out workspaces whose owner no longer exists (or is soft-deleted)
-- in Supabase Auth. A second function lists the live user ids so the dashboard can ignore deleted users too.
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_workspace_overview()
RETURNS TABLE (
  id UUID, name TEXT, owner_user_id UUID, owner_name TEXT, owner_email TEXT, created_at TIMESTAMPTZ,
  plan_code TEXT, plan_status TEXT, expires_at DATE, subscription_status TEXT,
  storage_allowance_gb NUMERIC, storage_used_bytes NUMERIC,
  events_count BIGINT, team_members_count BIGINT, services_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    w.id, w.name, w.owner_user_id,
    COALESCE(NULLIF(p.full_name, ''), p.email, u.email)::TEXT,
    COALESCE(p.email, u.email)::TEXT,
    w.created_at,
    CASE WHEN sub.id IS NULL THEN 'free' ELSE lower(COALESCE(sub.plan_code, 'free')) END,
    CASE
      WHEN sub.id IS NULL THEN w.plan_status::TEXT
      WHEN sub.status::TEXT = 'ACTIVE' AND sub.expires_at IS NOT NULL AND sub.expires_at < current_date THEN 'expired'
      ELSE lower(sub.status::TEXT)
    END,
    sub.expires_at,
    COALESCE(sub.status::TEXT, 'ACTIVE'),
    COALESCE(pp.storage_gb, 0)::NUMERIC,
    (SELECT COALESCE(SUM(su.total_bytes), 0) FROM storage_usage su WHERE su.workspace_id = w.id)::NUMERIC,
    (SELECT count(*) FROM events e WHERE e.workspace_id = w.id),
    (SELECT count(*) FROM team_members tm WHERE tm.workspace_id = w.id AND tm.status::TEXT = 'active'),
    (SELECT count(*) FROM services s WHERE s.workspace_id = w.id AND s.status::TEXT = 'active')
  FROM workspaces w
  JOIN auth.users u ON u.id = w.owner_user_id AND (to_jsonb(u) ->> 'deleted_at') IS NULL
  LEFT JOIN profiles p ON p.id = w.owner_user_id
  LEFT JOIN LATERAL (
    SELECT s2.id, s2.status, s2.expires_at, s2.pricing_id, pl.code AS plan_code
    FROM workspace_subscriptions s2
    LEFT JOIN plans pl ON pl.id = s2.plan_id
    WHERE s2.workspace_id = w.id
    ORDER BY (s2.status::TEXT = 'ACTIVE') DESC, s2.created_at DESC
    LIMIT 1
  ) sub ON TRUE
  LEFT JOIN plan_pricings pp ON pp.id = sub.pricing_id
  ORDER BY w.created_at DESC;
END;
$$;

-- Ids of users that still exist in Supabase Auth (not deleted, not soft-deleted).
CREATE OR REPLACE FUNCTION admin_live_user_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  RETURN QUERY SELECT u.id FROM auth.users u WHERE (to_jsonb(u) ->> 'deleted_at') IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION admin_workspace_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_live_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_workspace_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_live_user_ids() TO authenticated;
