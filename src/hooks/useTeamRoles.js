import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates team roles scoped to the active workspace.
export function useTeamRoles() {
  const { workspaceId } = useWorkspace();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.TeamRole.filter(
        { workspace_id: workspaceId },
        "name",
        500
      );
      setRoles(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createRole = useCallback(
    async (data) => {
      const r = await base44.entities.TeamRole.create({
        ...data,
        workspace_id: workspaceId,
      });
      setRoles((prev) => [...prev, r].sort((a, b) => a.name.localeCompare(b.name)));
      return r;
    },
    [workspaceId]
  );

  const updateRole = useCallback(async (id, data) => {
    const r = await base44.entities.TeamRole.update(id, data);
    setRoles((prev) =>
      [...prev.map((x) => (x.id === id ? r : x))].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    return r;
  }, []);

  return { roles, loading, error, refetch: load, createRole, updateRole };
}