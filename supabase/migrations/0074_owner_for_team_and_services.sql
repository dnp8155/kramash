-- ============================================================
-- 0074 — Give team members and services added through the server functions back to their owner
-- createTeamMember / createService (1.2.0.0) insert with the service role, which has no auth.uid(), so the
-- created_by_id trigger left it empty. Every read rule on these tables is "created_by_id = auth.uid()", so those rows
-- were saved but invisible (empty Team list after adding, "Cannot coerce the result to a single JSON object").
-- The functions now set created_by_id themselves; this fills in the rows already created, using the workspace owner.
-- Only rows with no creator are touched. Safe to re-run.
-- ============================================================

UPDATE team_members tm
SET created_by_id = w.owner_user_id
FROM workspaces w
WHERE tm.workspace_id = w.id
  AND tm.created_by_id IS NULL
  AND w.owner_user_id IS NOT NULL;

UPDATE services s
SET created_by_id = w.owner_user_id
FROM workspaces w
WHERE s.workspace_id = w.id
  AND s.created_by_id IS NULL
  AND w.owner_user_id IS NOT NULL;
