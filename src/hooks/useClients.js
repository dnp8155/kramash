import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates clients scoped to the active workspace.
export function useClients() {
  const { workspaceId } = useWorkspace();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.Client.filter(
        { workspace_id: workspaceId },
        "-created_date",
        500
      );
      setClients(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createClient = useCallback(
    async (data) => {
      const c = await base44.entities.Client.create({
        ...data,
        workspace_id: workspaceId,
      });
      setClients((prev) => [c, ...prev]);
      return c;
    },
    [workspaceId]
  );

  const updateClient = useCallback(async (id, data) => {
    const c = await base44.entities.Client.update(id, data);
    setClients((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  }, []);

  return { clients, loading, error, refetch: load, createClient, updateClient };
}