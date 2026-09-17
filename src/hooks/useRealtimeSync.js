import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { ENTITY_INVALIDATION_KEYS } from "@/lib/queryInvalidation";

// Debounce window: collect entity names from rapid-fire realtime events and
// batch-invalidate once per window. This prevents refetch storms when many
// entities change in quick succession (e.g. bulk operations, multi-device
// sync echoes) which can trigger N cascading refetches and hit rate limits.
const DEBOUNCE_MS = 300;

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  const pendingRef = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!workspaceId) return;

    const flush = () => {
      timerRef.current = null;
      const names = Array.from(pendingRef.current);
      pendingRef.current.clear();
      if (names.length === 0) return;
      const prefixes = new Set();
      names.forEach((name) => {
        const keys = ENTITY_INVALIDATION_KEYS[name];
        if (!keys) return;
        keys.forEach((prefix) => {
          prefixes.add(JSON.stringify(prefix));
        });
      });
      prefixes.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
      });
    };

    const schedule = (entityName) => {
      pendingRef.current.add(entityName);
      if (timerRef.current) return;
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    };

    const unsubs = [];
    Object.entries(ENTITY_INVALIDATION_KEYS).forEach(([entityName]) => {
      const entity = base44.entities[entityName];
      if (!entity || typeof entity.subscribe !== "function") return;

      const unsub = entity.subscribe((event) => {
        const data = event?.data || {};
        if (data.workspace_id && data.workspace_id !== workspaceId) return;
        schedule(entityName);
      });
      if (unsub) unsubs.push(unsub);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current.clear();
      unsubs.forEach((u) => {
        try { u && u(); } catch { /* noop */ }
      });
    };
  }, [queryClient, workspaceId]);
}