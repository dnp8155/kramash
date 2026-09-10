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

  // Routes through the manageAssignment backend function for server-side
  // SELF duplicate prevention (one SELF per event across team + service).
  const createAssignment = useCallback(
    async (data) => {
      const res = await base44.functions.invoke("manageAssignment", {
        operation: "create",
        assignment_type: "team",
        workspace_id: workspaceId,
        ...data,
      });
      const result = res?.data || res;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to create assignment");
      }
      const a = result.record;
      setAssignments((prev) => [a, ...prev]);
      return a;
    },
    [workspaceId]
  );

  const updateAssignment = useCallback(
    async (id, data) => {
      const res = await base44.functions.invoke("manageAssignment", {
        operation: "update",
        assignment_type: "team",
        workspace_id: workspaceId,
        assignment_id: id,
        ...data,
      });
      const result = res?.data || res;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to update assignment");
      }
      const a = result.record;
      setAssignments((prev) => prev.map((x) => (x.id === id ? a : x)));
      return a;
    },
    [workspaceId]
  );

  // Removal sets assignment_status to "Removed" (soft delete) — the assignment
  // record is retained for historical auditing and financial traceability.
  // Removed assignments disappear from active lists but remain in the database.
  const removeAssignment = useCallback(async (id) => {
    const a = await base44.entities.EventTeamAssignment.update(id, {
      assignment_status: "Removed",
    });
    setAssignments((prev) => prev.map((x) => (x.id === id ? a : x)));
    return a;
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