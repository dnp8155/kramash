import { isRoleOnlyItem, isIncludeItem } from "@/lib/quotationCalc";

// Roles quoted without a person that still have nobody on the event. They create no assignment (so no
// payments/calendar rows are affected); the event's Team tab shows them as "no member selected" cards.
// A role counts as filled once an assignment's role (or one of its "X & Y" roles) matches by name.
export function openRoleSlots(quotationItems, assignments) {
  const needed = new Map(); // role(lowercase) -> { role, perDay: Map(date -> count), undated: count }
  for (const it of quotationItems || []) {
    if (isIncludeItem(it) || !isRoleOnlyItem(it)) continue;
    const role = String(it.description || it.name || "").trim() || "Role";
    const key = role.toLowerCase();
    const entry = needed.get(key) || { role, perDay: new Map(), undated: 0 };
    if (it.day_date) entry.perDay.set(it.day_date, (entry.perDay.get(it.day_date) || 0) + 1);
    else entry.undated += 1;
    needed.set(key, entry);
  }
  const filled = new Map();
  for (const a of assignments || []) {
    for (const r of String(a.role_name_snapshot || "").split("&")) {
      const k = r.trim().toLowerCase();
      if (k) filled.set(k, (filled.get(k) || 0) + 1);
    }
  }
  const slots = [];
  for (const [key, e] of needed) {
    const required = Math.max(e.undated, ...e.perDay.values(), 0);
    const missing = required - (filled.get(key) || 0);
    const dates = [...e.perDay.keys()].sort();
    for (let i = 0; i < missing; i++) slots.push({ id: `${key}#${i}`, role: e.role, dates });
  }
  return slots;
}
