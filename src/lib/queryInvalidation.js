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
    ["dashboard"],
    ["dashboard-events"],
    ["dashboard-transactions"],
    ["dashboard-assignments"],
    ["dashboard-blockdates"],
    ["financial"]
  ],
  Client: [
    ["clients"],
    ["client"],
    ["dashboard"],
    ["dashboard-clients"]
  ],
  TeamMember: [
    ["team"],
    ["team-member"],
    ["dashboard"],
    ["dashboard-members"],
    ["financial"]
  ],
  Lead: [
    ["leads"]
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
  Invoice: [
    ["invoices"],
    ["invoice"],
    ["financial"],
    ["event"]
  ],
  InvoiceItem: [
    ["invoice"]
  ],
  FinancialTransaction: [
    ["financial"],
    ["event"],
    ["dashboard"],
    ["dashboard-transactions"]
  ],
  EventTeamAssignment: [
    ["event"],
    ["team"],
    ["team-member"],
    ["dashboard"],
    ["dashboard-assignments"]
  ],
  EventDayAssignment: [
    ["event"],
    ["dashboard"],
    ["dashboard-assignments"]
  ],
  EventServiceAssignment: [
    ["event"],
    ["financial"]
  ],
  ServiceProvider: [
    ["event"]
  ],
  ExpenseCategory: [
    ["financial"]
  ],
  TeamBlockDate: [
    ["team"],
    ["team-member"],
    ["dashboard"],
    ["dashboard-blockdates"]
  ],
  EventReminder: [
    ["event"]
  ],
  PaymentMilestone: [
    ["event"],
    ["financial"],
    ["dashboard"],
    ["dashboard-transactions"]
  ],
  QuotationPackage: [
    ["quotation"]
  ],
  FinancialYear: [
    ["financial"]
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

/**
 * Invalidate only the *related* query prefixes for an entity, skipping the
 * first prefix (the entity's own main list). This avoids triggering an
 * immediate refetch of the main list — which under backend latency can
 * return stale data and overwrite optimistic UI updates. Related pages
 * (dashboard, detail, financial, etc.) are still invalidated so they
 * refresh when next mounted.
 *
 * Use together with upsertOptimistic() to keep the main list in sync
 * without a refetch race.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} entityName
 */
export function invalidateRelated(queryClient, entityName) {
  const keys = ENTITY_INVALIDATION_KEYS[entityName];
  if (!keys || keys.length <= 1) return;
  keys.slice(1).forEach((prefix) =>
    queryClient.invalidateQueries({ queryKey: prefix })
  );
}

/**
 * Optimistically insert/update a record inside a cached query list without
 * triggering a refetch. Combined with invalidateRelated(), this gives instant
 * UI feedback while avoiding the stale-refetch race that can revert the
 * display to pre-save data.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {Array} queryKey - exact key of the list query to update
 * @param {object} record - the newly created/updated record
 * @param {(data:any)=>Array} getList - extracts the array from cached data
 * @param {(data:any, newList:Array)=>object} setList - returns new data with replaced list
 */
export function upsertOptimistic(queryClient, queryKey, record, getList, setList) {
  queryClient.setQueryData(queryKey, (old) => {
    if (!old) return old;
    const list = getList(old);
    if (!Array.isArray(list)) return old;
    const idx = list.findIndex((item) => item.id === record.id);
    const newList =
      idx >= 0
        ? list.map((item) => (item.id === record.id ? { ...item, ...record } : item))
        : [record, ...list];
    return setList(old, newList);
  });
}