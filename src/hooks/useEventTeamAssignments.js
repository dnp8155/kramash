import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates event-team assignments scoped to the active workspace.
export function useEventTeamAssignments() {
  const { workspaceId } = useWorkspace();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.EventTeamAssignment.filter(
        { workspace_id: workspaceId },
        "-created_date",
        1000
      );
      setAssignments(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createAssignment = useCallback(
    async (data) => {
      const a = await base44.entities.EventTeamAssignment.create({
        ...data,
        workspace_id: workspaceId,
      });
      setAssignments((prev) => [a, ...prev]);
      return a;
    },
    [workspaceId]
  );

  const updateAssignment = useCallback(async (id, data) => {
    const a = await base44.entities.EventTeamAssignment.update(id, data);
    setAssignments((prev) => prev.map((x) => (x.id === id ? a : x)));
    return a;
  }, []);

  // Removal deletes the assignment relationship, not the team member.
  const removeAssignment = useCallback(async (id) => {
    await base44.entities.EventTeamAssignment.delete(id);
    setAssignments((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    assignments,
    loading,
    error,
    refetch: load,
    createAssignment,
    updateAssignment,
    removeAssignment,
  };
}