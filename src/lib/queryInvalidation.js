/**
 * Centralized React Query invalidation key sets per entity.
 *
 * Every page that displays an entity's data uses a query key that starts with
 * one of these prefixes. When the entity changes (create/update/delete), we
 * invalidate all matching prefixes so every page refreshes — dashboard, lists,
 * detail pages, financial, team, calendar, etc.
 *
 * Used by:
 *   - useRealtimeSync (realtime push from the server)
 *   - mutation sites (manual invalidation after a write)
 *
 * Keep this map in sync with the queryKey prefixes used across the app.
 */
export const ENTITY_INVALIDATION_KEYS = {
  Event: [
    ["events"],
    ["event"],
    ["dashboard-events"],
    ["dashboard-transactions"],
    ["dashboard-assignments"],
    ["dashboard-blockdates"],
    ["financial"]
  ],
  Client: [
    ["clients"],
    ["client"],
    ["dashboard-clients"]
  ],
  TeamMember: [
    ["team"],
    ["team-member"],
    ["dashboard-members"],
    ["financial"]
  ],
  TeamRole: [
    ["team"],
    ["rate-estimator"]
  ],
  Service: [
    ["rate-estimator"]
  ],
  Quotation: [
    ["quotations"],
    ["quotation"]
  ],
  QuotationItem: [
    ["quotation"]
  ],
  FinancialTransaction: [
    ["financial"],
    ["event"],
    ["dashboard-transactions"]
  ],
  EventTeamAssignment: [
    ["event"],
    ["team"],
    ["team-member"],
    ["dashboard-assignments"]
  ],
  EventDayAssignment: [
    ["event"],
    ["dashboard-assignments"]
  ],
  ExpenseCategory: [
    ["financial"]
  ],
  TeamBlockDate: [
    ["team"],
    ["team-member"],
    ["dashboard-blockdates"]
  ],
  EventReminder: [
    ["event"]
  ]
};

/**
 * Invalidate all React Query caches that depend on the given entity.
 * Use this after any mutation (create/update/delete) so every page that
 * displays the entity's data refreshes.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} entityName - e.g. "Event", "FinancialTransaction"
 */
export function invalidateEntity(queryClient, entityName) {
  const keys = ENTITY_INVALIDATION_KEYS[entityName];
  if (!keys) return;
  keys.forEach((prefix) => queryClient.invalidateQueries({ queryKey: prefix }));
}

/**
 * Invalidate multiple entities at once (convenience wrapper).
 */
export function invalidateEntities(queryClient, entityNames) {
  (entityNames || []).forEach((name) => invalidateEntity(queryClient, name));
}