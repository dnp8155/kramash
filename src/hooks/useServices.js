import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates services scoped to the active workspace.
export function useServices() {
  const { workspaceId } = useWorkspace();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setServices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.Service.filter(
        { workspace_id: workspaceId },
        "name",
        500
      );
      setServices(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createService = useCallback(
    async (data) => {
      const res = await base44.functions.invoke("createResource", {
        workspace_id: workspaceId,
        resource_type: "services",
        resource_data: data,
      });
      const result = res?.data || res;
      if (result?.error === "PLAN_LIMIT_REACHED") {
        throw new Error(result.message);
      }
      if (!result?.success) {
        throw new Error(result?.error || "Failed to create service");
      }
      const s = result.record;
      setServices((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
      return s;
    },
    [workspaceId]
  );

  const updateService = useCallback(async (id, data) => {
    const s = await base44.entities.Service.update(id, data);
    setServices((prev) =>
      [...prev.map((x) => (x.id === id ? s : x))].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    return s;
  }, []);

  const deleteService = useCallback(async (id) => {
    await base44.entities.Service.delete(id);
    setServices((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    services,
    loading,
    error,
    refetch: load,
    createService,
    updateService,
    deleteService,
  };
}