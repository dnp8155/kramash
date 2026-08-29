import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { ENTITY_INVALIDATION_KEYS } from "@/lib/queryInvalidation";

/**
 * Subscribes to realtime updates for the workspace's main entities and
 * invalidates the relevant React Query caches so pages refresh automatically
 * when data changes server-side (including from other devices/sessions).
 *
 * The entity→key-prefix mapping lives in @/lib/queryInvalidation so that
 * realtime pushes and manual mutations invalidate the exact same set of caches.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    if (!workspaceId) return;

    const unsubs = [];
    Object.entries(ENTITY_INVALIDATION_KEYS).forEach(([entityName, keyPrefixes]) => {
      const entity = base44.entities[entityName];
      if (!entity || typeof entity.subscribe !== "function") return;

      const unsub = entity.subscribe((event) => {
        const data = event?.data || {};
        // Ignore events from other workspaces (defensive — RLS already scopes reads).
        if (data.workspace_id && data.workspace_id !== workspaceId) return;
        keyPrefixes.forEach((prefix) => {
          queryClient.invalidateQueries({ queryKey: prefix });
        });
      });
      if (unsub) unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => {
        try { u && u(); } catch { /* noop */ }
      });
    };
  }, [queryClient, workspaceId]);
}