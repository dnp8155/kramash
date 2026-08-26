import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Maps each subscribed entity to the React Query key prefixes that should be
// invalidated when a realtime create/update/delete event arrives for it.
const ENTITY_KEY_MAP = {
  Event: [["events"], ["event"], ["financial"]],
  Client: [["clients"], ["client"]],
  TeamMember: [["team"], ["team-member"], ["financial"]],
  Quotation: [["quotations"], ["quotation"]],
  QuotationItem: [["quotation"]],
  FinancialTransaction: [["financial"], ["event"]],
  EventTeamAssignment: [["event"], ["team"]],
  TeamRole: [["team"], ["rate-estimator"]],
  Service: [["rate-estimator"]],
  ExpenseCategory: [["financial"]]
};

/**
 * Subscribes to realtime updates for the workspace's main entities and
 * invalidates the relevant React Query caches so pages refresh automatically
 * when data changes server-side (including from other devices/sessions).
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    if (!workspaceId) return;

    const unsubs = [];
    Object.entries(ENTITY_KEY_MAP).forEach(([entityName, keyPrefixes]) => {
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