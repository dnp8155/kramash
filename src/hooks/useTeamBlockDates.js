import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates team block dates scoped to the active workspace.
// Block dates mark a team member as unavailable for a date range (leave,
// personal, holiday, etc.). Active blocks affect availability and conflict
// detection; cancelled blocks are retained for audit but do not block.
export function useTeamBlockDates(memberId = null) {
  const { workspaceId } = useWorkspace();
  const [blockDates, setBlockDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setBlockDates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filter = memberId
        ? { workspace_id: workspaceId, team_member_id: memberId }
        : { workspace_id: workspaceId };
      const list = await base44.entities.TeamBlockDate.filter(
        filter,
        "-start_date",
        500
      );
      setBlockDates(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load block dates");
      setBlockDates([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const createBlockDate = useCallback(
    async (data) => {
      const payload = {
        ...data,
        workspace_id: workspaceId,
        end_date: data.end_date || data.start_date,
        reason: data.reason || "Leave",
        status: "active",
      };
      const b = await base44.entities.TeamBlockDate.create(payload);
      setBlockDates((prev) => [b, ...prev]);
      return b;
    },
    [workspaceId]
  );

  const updateBlockDate = useCallback(async (id, data) => {
    const b = await base44.entities.TeamBlockDate.update(id, data);
    setBlockDates((prev) => prev.map((x) => (x.id === id ? b : x)));
    return b;
  }, []);

  const cancelBlockDate = useCallback(async (id) => {
    const b = await base44.entities.TeamBlockDate.update(id, {
      status: "cancelled",
    });
    setBlockDates((prev) => prev.map((x) => (x.id === id ? b : x)));
    return b;
  }, []);

  const deleteBlockDate = useCallback(async (id) => {
    await base44.entities.TeamBlockDate.delete(id);
    setBlockDates((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    blockDates,
    loading,
    error,
    refetch: load,
    createBlockDate,
    updateBlockDate,
    cancelBlockDate,
    deleteBlockDate,
  };
}