// Track: expected-delivery rules, and the deliverables an accepted quotation suggests.
//
// Rules (Preferences → Types & Display → Track, saved in display_preferences.trackDueRules):
//   { rules: [{ word: "Album", days: 45 }, …], otherDays: 30 | null }
// A new Track item gets "expected by" = the event's LAST day + the days of the first rule whose word is in its name
// (case does not matter, so "Album" covers "Wedding Album"), else `otherDays`, else no date. Dates set by hand are
// never touched; the rules only fill in items as they are added.
import { eventDayList, parseISODate, toISODate } from "@/lib/dates";
import { isIncludeItem } from "@/lib/quotationCalc";

export const MAX_DUE_DAYS = 365;
export const MAX_DUE_RULES = 12;
export const MAX_RULE_WORD = 30;

// Always a clean { rules, otherDays } whatever was saved (or nothing).
export function normalizeDueRules(raw) {
  const rules = (Array.isArray(raw?.rules) ? raw.rules : [])
    .map((r) => ({ word: String(r?.word || "").trim().slice(0, MAX_RULE_WORD), days: clampDays(r?.days) }))
    .filter((r) => r.word && r.days !== null)
    .slice(0, MAX_DUE_RULES);
  return { rules, otherDays: clampDays(raw?.otherDays) };
}

export function clampDays(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_DUE_DAYS, n);
}

// The days that apply to an item name, or null (no rule and no "anything else").
export function dueDaysFor(name, raw) {
  const { rules, otherDays } = normalizeDueRules(raw);
  const text = String(name || "").toLowerCase();
  const hit = rules.find((r) => text.includes(r.word.toLowerCase()));
  return hit ? hit.days : otherDays;
}

// "YYYY-MM-DD" for a new item called `name` on `event`, or null when no rule applies or the event has no dates.
export function expectedDateFor(name, event, raw) {
  const days = dueDaysFor(name, raw);
  if (days === null) return null;
  const list = eventDayList(event);
  const last = parseISODate(list[list.length - 1]);
  if (!last) return null;
  last.setDate(last.getDate() + days);
  return toISODate(last);
}

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

// What the accepted quotation's "Includes / Deliverables" lines would add to Track: { name, quantity } for each line
// not already on the list (matched by name, case and spacing ignored) and not dismissed. Lines with the same name are
// merged (quantities added up).
export function quotationSuggestions(quotationItems, trackItems, dismissed = [], maxQty = 25000) {
  const have = new Set((trackItems || []).map((x) => norm(x.title)));
  const skip = new Set((dismissed || []).map(norm));
  const byName = new Map();
  for (const it of quotationItems || []) {
    if (!isIncludeItem(it)) continue;
    const name = String(it.name || "").trim().slice(0, 120);
    const key = norm(name);
    if (!key || have.has(key) || skip.has(key)) continue;
    const q = Math.max(1, Math.round(Number(it.quantity) || 1));
    const prev = byName.get(key);
    byName.set(key, { name: prev?.name || name, quantity: Math.min(maxQty, (prev?.quantity || 0) + q) });
  }
  return [...byName.values()];
}
