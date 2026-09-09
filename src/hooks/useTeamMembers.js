import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates team members scoped to the active workspace.
export function useTeamMembers() {
  const { workspaceId } = useWorkspace();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.TeamMember.filter(
        { workspace_id: workspaceId },
        "-created_date",
        500
      );
      setMembers(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load team");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createMember = useCallback(
    async (data) => {
      const m = await base44.entities.TeamMember.create({
        ...data,
        workspace_id: workspaceId,
      });
      setMembers((prev) => [m, ...prev]);
      return m;
    },
    [workspaceId]
  );

  const updateMember = useCallback(async (id, data) => {
    const m = await base44.entities.TeamMember.update(id, data);
    setMembers((prev) => prev.map((x) => (x.id === id ? m : x)));
    return m;
  }, []);

  return { members, loading, error, refetch: load, createMember, updateMember };
}