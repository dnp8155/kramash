import { formatDate } from "@/lib/dates";

// Day numbering for the portal: event dates first, then any quotation dates not in
// that list, all sorted — so every day gets a "Day N" label, not just the first.
export function buildDayIndex(eventDates = [], items = []) {
  const all = new Set([...(eventDates || []), ...items.map((i) => i.day_date)].filter(Boolean));
  return [...all].sort();
}

// "Day 2 · 14 Feb 2026 — Reception"
export function dayHeading(date, title, dayIndex) {
  if (!date) return title ? `Other — ${title}` : "Other";
  const n = dayIndex.indexOf(date);
  return `${n >= 0 ? `Day ${n + 1} · ` : ""}${formatDate(date)}${title ? ` — ${title}` : ""}`;
}

// Group items by day (sorted, undated last), carrying the phase title.
export function groupByDay(items) {
  const days = new Map();
  for (const t of items) {
    const key = t.day_date || "";
    if (!days.has(key)) days.set(key, { date: key, title: t.phase_title || "", items: [] });
    const d = days.get(key);
    if (!d.title && t.phase_title) d.title = t.phase_title;
    d.items.push(t);
  }
  return [...days.values()].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}
