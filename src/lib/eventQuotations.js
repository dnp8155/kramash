// An event can have several accepted quotations (e.g. the main one plus a later add-on quotation). The event's
// dates, total, team and services follow ALL of them together, so syncing one never wipes out what another added.
// Only the newest revision of each quotation counts ("Q-001-R2" replaces "Q-001"); older revisions are normally
// cancelled already, this just makes sure one is never counted twice.
// No app imports here on purpose: it is used by the sync (clientEdgeFunctions) and the quotation service.

const REV_RE = /-R(\d+)$/i;
const revBase = (num) => String(num || "").replace(REV_RE, "").trim().toLowerCase();
// The quotation "family" (all revisions of one quotation); a quotation without a number is its own family.
export const familyKey = (q) => revBase(q?.quotation_number) || q?.id || "";
const revNo = (num) => { const m = String(num || "").match(REV_RE); return m ? Number(m[1]) : 1; };

// Keeps the newest revision of each quotation family. When two share a number (shouldn't happen), the first wins.
export function latestRevisionsOnly(quotations) {
  const best = new Map();
  for (const q of quotations || []) {
    if (!q) continue;
    const key = revBase(q.quotation_number) || q.id;
    const cur = best.get(key);
    if (!cur || revNo(q.quotation_number) > revNo(cur.quotation_number)) best.set(key, q);
  }
  return [...best.values()];
}

// Accepted quotations of an event, always including `current` (the one being accepted / synced), newest revisions only,
// in a stable order (by quotation number) so totals and merged lines don't jump around.
export async function acceptedQuotationsOfEvent(base44, workspaceId, eventId, current) {
  let list = [];
  if (eventId) {
    try { list = await base44.entities.Quotation.filter({ workspace_id: workspaceId, event_id: eventId }); } catch { list = []; }
  }
  // The quotation being accepted / synced always counts as itself: other revisions of ITS family are left out
  // (so syncing an older revision never swaps in a newer one's lines), other families keep their newest revision.
  const fam = current ? familyKey(current) : null;
  const accepted = (list || []).filter((q) => q && q.status === "accepted" && (!current || (q.id !== current.id && familyKey(q) !== fam)));
  return [...latestRevisionsOnly(accepted), ...(current ? [current] : [])].sort((a, b) => String(a.quotation_number || "").localeCompare(String(b.quotation_number || "")));
}

export const combinedTotal = (quotations) =>
  Math.round((quotations || []).reduce((s, q) => s + (Number(q.grand_total) || 0), 0) * 100) / 100;
