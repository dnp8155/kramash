// What a team member's bookings look like, shared by the Team Portal and "Work from others" in their own app.
import { datesBetween } from "@/lib/calendarLinks";

export const EVENT_STATUS_META = {
  upcoming: { label: "Upcoming", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  today: { label: "Today", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  postponed: { label: "Postponed", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" }
};

// The portal shows the member their OWN status, not the event status: once their booked dates are over
// (or the owner marked the event completed) their part is done, even while the event itself goes on.
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function memberDates(item) {
  if (item.working_dates?.length) return item.working_dates;
  if (item.dates?.length) return item.dates;
  return [item.start_date, item.end_date].filter(Boolean);
}
export function memberStatusMeta(item, eventStatus) {
  if (eventStatus === "postponed") return EVENT_STATUS_META.postponed;
  const dates = [...memberDates(item)].sort();
  const today = todayLocal();
  // last_day: set when only a service is booked (one day shown, but the job runs to the event's end).
  const last = item.last_day || dates[dates.length - 1];
  if (eventStatus === "completed" || (last && last < today)) return EVENT_STATUS_META.completed;
  if (dates.includes(today) || (dates[0] && dates[0] <= today && today <= last && (item.last_day || (!item.working_dates?.length && !item.dates?.length)))) return EVENT_STATUS_META.today;
  return EVENT_STATUS_META.upcoming;
}

// One card per event: a member booked on the same event for a role AND a service (or the same role twice) used to
// get a separate card for each, which read like separate jobs. Rows with the same role/service name on an event
// are merged (dates combined, amounts added). The card reads like a single booking: all dates, venue, every role, total.
// A booking's days: the picked working days, else every day from start to end (service bookings and team bookings
// without picked days only have the range, so showing just the first day made a 3-day job look over after day 1).
export function itemDates(s) {
  // A service (e.g. "Wedding Film") has no days of its own; the server sends the whole event span. Its day is the
  // event's first day only (used only when the member has no booked days), so a long event never lists every day.
  if (s.type === "service") return [s.start_date].filter(Boolean);
  return s.working_dates?.length ? s.working_dates : s.dates?.length ? s.dates : datesBetween(s.start_date, s.end_date || s.start_date);
}
export function groupByEvent(items, newestFirst = false) {
  const groups = new Map();
  for (const s of items || []) {
    const key = s.event_id || s.id;
    let g = groups.get(key);
    if (!g) {
      g = { id: key, event_title: s.event_title, venue: s.venue, event_status: s.event_status, lines: new Map(), dateSet: new Set(), total: 0 };
      groups.set(key, g);
    }
    const name = (s.role_name || "").trim();
    const lineKey = name.toLowerCase() || s.id;
    const line = g.lines.get(lineKey) || { key: lineKey, role_name: name, dateSet: new Set(), agreed_rate: 0 };
    // Only the member's own booked days are shown; a service's day is used only when they have none on the event.
    if (s.type === "service") {
      g.svcDates = g.svcDates || new Set();
      itemDates(s).forEach((d) => g.svcDates.add(d));
      const end = s.end_date || s.start_date || "";
      if (end > (g.svcEnd || "")) g.svcEnd = end;
    } else {
      itemDates(s).forEach((d) => { line.dateSet.add(d); g.dateSet.add(d); });
    }
    line.agreed_rate += Number(s.agreed_rate) || 0;
    g.lines.set(lineKey, line);
    g.total += Number(s.agreed_rate) || 0;
  }
  const round2 = (n) => Math.round(n * 100) / 100;
  return [...groups.values()]
    .map(({ svcDates, svcEnd, ...g }) => ({
      ...g,
      total: round2(g.total),
      dates: [...(g.dateSet.size ? g.dateSet : svcDates || [])].sort(),
      // Service-only: status and Upcoming/Past follow the event's last day, not the one day shown.
      last_day: g.dateSet.size ? undefined : svcEnd,
      lines: [...g.lines.values()].map((l) => ({ ...l, dates: [...l.dateSet].sort(), agreed_rate: round2(l.agreed_rate) })),
    }))
    .sort((a, b) => ((a.dates[0] || "") > (b.dates[0] || "") ? 1 : -1) * (newestFirst ? -1 : 1));
}

