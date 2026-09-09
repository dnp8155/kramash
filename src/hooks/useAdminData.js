import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Admin-only hook: fetches all workspaces, users, and subscriptions for the SaaS Admin dashboard.
export function useAdminData() {
  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ws, us, subs] = await Promise.all([
        base44.entities.Workspace.list(),
        base44.entities.User.list(),
        base44.entities.WorkspaceSubscription.list(),
      ]);
      setWorkspaces(ws || []);
      setUsers(us || []);
      setSubscriptions(subs || []);
    } catch (e) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    workspaces,
    users,
    subscriptions,
    loading,
    error,
    refetch: load,
    setSubscriptions,
  };
}

// Count resource usage for a specific workspace (admin view).
export async function fetchWorkspaceUsage(workspaceId) {
  const [events, members, services] = await Promise.all([
    base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 1000),
    base44.entities.TeamMember.filter({ workspace_id: workspaceId, status: "Active" }, "-created_date", 1000),
    base44.entities.Service.filter({ workspace_id: workspaceId, status: "active" }, "name", 1000),
  ]);
  return {
    events: (events || []).length,
    team_members: (members || []).length,
    services: (services || []).length,
  };
}