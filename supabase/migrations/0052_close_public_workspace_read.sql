-- ============================================================
-- 0052 — Stop anonymous reads of published workspace rows
-- 0015 let ANYONE (even signed out) read every column of a workspace whose public profile is on, which included
-- details the owner had switched off (phone, email, address, GSTIN…). The public page and the portals now get
-- their data from the getPublicProfile function, which returns only what the owner chose to show, so that
-- open rule is no longer needed.
--
-- Run this AFTER deploying getPublicProfile (v1.1.8) and the new frontend, otherwise the public page and the
-- client / team portal provider card cannot load their data.
-- Members of a workspace keep reading it (workspaces_read_members); owners and admins are unchanged.
-- Safe to run again.
-- ============================================================
DROP POLICY IF EXISTS workspaces_read_public_profile ON workspaces;

DROP POLICY IF EXISTS workspaces_read_members ON workspaces;
CREATE POLICY workspaces_read_members ON workspaces FOR SELECT
  USING (id = ANY(user_workspace_ids()));
