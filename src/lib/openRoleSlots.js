import { isRoleOnlyItem, isIncludeItem, normalizeRoleItem } from "@/lib/quotationCalc";
import { isBookedOnDate } from "@/lib/teamService";

// Roles quoted without a person that still have nobody on the event. They create no assignment (so no
// payments/calendar rows are affected); the event's Team tab shows them as "no member selected" cards.
//
// Checked per DATE: a role quoted on 3 dates and filled on 2 still shows a card for the third date.
// A role counts as filled on a date by an assignment with that role (or one of its "X & Y" roles) booked on
// that date. A dated slot is also filled by an assignment whose role isn't quoted at all (e.g. quoted as
// "Hybrid Photographer", assigned as "Photographer") when that person is booked on that date.
// Lines from every accepted quotation of the event count (items may carry `_quoteNumber`).
const rolesOf = (a) => String(a.role_name_snapshot || "").split("&").map((r) => r.trim().toLowerCase()).filter(Boolean);

// A member booked on chosen days only (working_dates) is not booked on the days in between.
// Without the event (dates unknown) an assignment with no chosen days counts for every date.
const bookedOn = (a, event, d) => {
  if (a.working_dates?.length) return a.working_dates.includes(d);
  if (a.booking_start_date) return d >= a.booking_start_date && d <= (a.booking_end_date || a.booking_start_date);
  return event ? isBookedOnDate(a, event, d) : true;
};

export function openRoleSlots(quotationItems, assignments, event = null) {
  const needed = new Map(); // role(lowercase) -> { role, perDay: Map(date -> count), undated: count, quotes: Set }
  for (const raw of quotationItems || []) {
    const it = normalizeRoleItem(raw);
    if (isIncludeItem(it) || !isRoleOnlyItem(it)) continue;
    const role = String(it.description || it.name || "").trim() || "Role";
    const key = role.toLowerCase();
    const entry = needed.get(key) || { role, perDay: new Map(), undated: 0, quotes: new Set() };
    const count = 1; // one quotation line = one person (as the PDF counts them); quantity is the billing unit
    if (it.day_date) entry.perDay.set(it.day_date, (entry.perDay.get(it.day_date) || 0) + count);
    else entry.undated += count;
    if (it._quoteNumber) entry.quotes.add(it._quoteNumber);
    needed.set(key, entry);
  }

  const active = (assignments || []).filter((a) => a.assignment_status !== "removed");
  // Assignments none of whose roles were quoted; each can stand in for one open slot per date.
  const spare = active.filter((a) => !rolesOf(a).some((r) => needed.has(r)));
  const spareUsed = new Map(); // date -> Set(assignment id)

  const slots = [];
  for (const [key, e] of needed) {
    const quotes = [...e.quotes].sort();
    if (e.perDay.size === 0) {
      // Undated lines (single-list quotation): filled by anyone with the role, whatever the date.
      const filled = active.filter((a) => rolesOf(a).includes(key)).length;
      for (let i = 0; i < e.undated - filled; i++) slots.push({ id: `${key}#${i}`, role: e.role, dates: [], quotes });
      continue;
    }
    const missing = new Map(); // date -> how many still open
    for (const [d, need] of e.perDay) {
      let open = need - active.filter((a) => rolesOf(a).includes(key) && bookedOn(a, event, d)).length;
      const used = spareUsed.get(d) || new Set();
      for (const a of spare) {
        if (open <= 0) break;
        if (!used.has(a.id) && bookedOn(a, event, d)) { used.add(a.id); open--; }
      }
      spareUsed.set(d, used);
      if (open > 0) missing.set(d, open);
    }
    // One card per missing person: the first card lists every date still short, the next the dates short by 2+, …
    const most = Math.max(0, ...missing.values());
    for (let i = 0; i < most; i++) {
      const dates = [...missing.entries()].filter(([, n]) => n > i).map(([d]) => d).sort();
      slots.push({ id: `${key}#${i}`, role: e.role, dates, quotes });
    }
  }
  return slots;
}
