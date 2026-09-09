import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates events scoped to the active workspace.
export function useEvents() {
  const { workspaceId } = useWorkspace();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.Event.filter(
        { workspace_id: workspaceId },
        "-created_date",
        500
      );
      setEvents(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createEvent = useCallback(
    async (data) => {
      const res = await base44.functions.invoke("createResource", {
        workspace_id: workspaceId,
        resource_type: "events",
        resource_data: data,
      });
      const result = res?.data || res;
      if (result?.error === "PLAN_LIMIT_REACHED") {
        throw new Error(result.message);
      }
      if (!result?.success) {
        throw new Error(result?.error || "Failed to create event");
      }
      const ev = result.record;
      setEvents((prev) => [ev, ...prev]);
      return ev;
    },
    [workspaceId]
  );

  const updateEvent = useCallback(async (id, data) => {
    const ev = await base44.entities.Event.update(id, data);
    setEvents((prev) => prev.map((x) => (x.id === id ? ev : x)));
    return ev;
  }, []);

  return { events, loading, error, refetch: load, createEvent, updateEvent };
}