import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates event-service assignments scoped to the active workspace.
// Uses soft-delete (assignment_status = "Removed") to preserve financial history.
export function useEventServiceAssignments() {
  const { workspaceId } = useWorkspace();
  const [serviceAssignments, setServiceAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setServiceAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.EventServiceAssignment.filter(
        { workspace_id: workspaceId },
        "-created_date",
        1000
      );
      setServiceAssignments(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load service assignments");
      setServiceAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  // Routes through the manageAssignment backend function for server-side
  // SELF duplicate prevention (one SELF per event across team + service).
  const createServiceAssignment = useCallback(
    async (data) => {
      const res = await base44.functions.invoke("manageAssignment", {
        operation: "create",
        assignment_type: "service",
        workspace_id: workspaceId,
        ...data,
      });
      const result = res?.data || res;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to create assignment");
      }
      const a = result.record;
      setServiceAssignments((prev) => [a, ...prev]);
      return a;
    },
    [workspaceId]
  );

  const updateServiceAssignment = useCallback(
    async (id, data) => {
      const res = await base44.functions.invoke("manageAssignment", {
        operation: "update",
        assignment_type: "service",
        workspace_id: workspaceId,
        assignment_id: id,
        ...data,
      });
      const result = res?.data || res;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to update assignment");
      }
      const a = result.record;
      setServiceAssignments((prev) => prev.map((x) => (x.id === id ? a : x)));
      return a;
    },
    [workspaceId]
  );

  // Soft-delete: marks as Removed so associated payment records retain their link.
  const removeServiceAssignment = useCallback(async (id) => {
    const a = await base44.entities.EventServiceAssignment.update(id, {
      assignment_status: "Removed",
    });
    setServiceAssignments((prev) => prev.map((x) => (x.id === id ? a : x)));
  }, []);

  return {
    serviceAssignments,
    loading,
    error,
    refetch: load,
    createServiceAssignment,
    updateServiceAssignment,
    removeServiceAssignment,
  };
}