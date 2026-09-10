import { useMemo } from "react";
import { todayISO, parseISODate, toISODate } from "@/lib/dates";
import { CalendarDays, Users, Briefcase, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// Returns the actual dates a team assignment covers.
// Prefers working_dates, then booking range, then event dates.
function getAssignmentDates(a, ev) {
  const wd = Array.isArray(a.working_dates) ? a.working_dates.filter(Boolean) : [];
  if (wd.length > 0) return wd;
  if (a.booking_start_date) {
    const start = a.booking_start_date;
    const end = a.booking_end_date || start;
    if (start === end) return [start];
    const out = [];
    let cur = parseISODate(start);
    const endD = parseISODate(end);
    if (!cur || !endD) return [start];
    while (cur <= endD) {
      out.push(toISODate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }
  // Fall back to event dates
  const ed = Array.isArray(ev?.event_dates) && ev.event_dates.length > 0
    ? ev.event_dates
    : (ev?.start_date ? [ev.start_date] : []);
  return ed;
}

export default function UpcomingBookingsList({
  members = [], assignments = [], eventsById = {},
  serviceAssignments = [], dayAssignments = [], services = [],
  onEventClick
}) {
  const { teamRows, serviceRows } = useMemo(() => {
    const today = todayISO();
    const memberMap = {};
    members.forEach((m) => { memberMap[m.id] = m; });
    const serviceMap = {};
    services.forEach((s) => { serviceMap[s.id] = s; });

    // Team bookings — one row per (member, event, assigned date)
    const tRows = [];
    for (const a of assignments) {
      if (a.assignment_status === "removed") continue;
      const ev = eventsById[a.event_id];
      if (!ev || ev.status === "cancelled") continue;
      const m = memberMap[a.team_member_id];
      if (!m) continue;
      const dates = getAssignmentDates(a, ev);
      for (const d of dates) {
        if (d < today) continue; // skip past
        tRows.push({ key: `${a.id}-${d}`, type: "team", member: m, event: ev, date: d });
      }
    }

    // Service bookings — one row per (service, event, scheduled date)
    const sRows = [];
    for (const da of dayAssignments) {
      if (!da.date || da.date < today) continue;
      const ev = eventsById[da.event_id];
      if (!ev || ev.status === "cancelled") continue;
      const svcIds = da.service_ids || [];
      for (const sid of svcIds) {
        const svc = serviceMap[sid];
        if (!svc) continue;
        sRows.push({ key: `${da.id}-${sid}`, type: "service", service: svc, event: ev, date: da.date });
      }
    }

    // Sort: date ascending, then event title, then item name
    const sortFn = (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.event?.title || "").localeCompare(b.event?.title || "") ||
      (a.member?.name || a.service?.name || "").localeCompare(b.member?.name || b.service?.name || "");

    tRows.sort(sortFn);
    sRows.sort(sortFn);

    return { teamRows: tRows.slice(0, 30), serviceRows: sRows.slice(0, 30) };
  }, [members, assignments, eventsById, dayAssignments, services]);

  const total = teamRows.length + serviceRows.length;
  const fmt = (s) => {
    try {
      return new Date(s + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return s; }
  };

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Upcoming Bookings</h3>
        </div>
        <p className="text-sm text-muted-foreground py-6 text-center">No upcoming bookings. Assign team members or services to events to see them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">Upcoming Bookings</h3>
        <span className="text-xs text-muted-foreground ml-auto">{total} upcoming</span>
      </div>

      <div className="space-y-4">
        {/* Team bookings */}
        {teamRows.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <Users className="w-3.5 h-3.5" /> Team
            </div>
            <div className="divide-y divide-border">
              {teamRows.map((r) => (
                <div key={r.key} className="flex items-center gap-3 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {r.member.is_self ? (
                      <Crown className="w-4 h-4 text-warning" />
                    ) : (
                      r.member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {r.member.name}
                      {r.member.is_self && <span className="text-xs text-warning font-semibold ml-1">SELF</span>}
                    </div>
                    <button
                      onClick={() => onEventClick?.(r.event)}
                      className="text-xs text-primary hover:underline truncate block text-left"
                    >
                      {r.event.title}
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground text-right whitespace-nowrap shrink-0">
                    {fmt(r.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service bookings */}
        {serviceRows.length > 0 && (
          <div className={teamRows.length > 0 ? "pt-3 border-t border-border" : ""}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <Briefcase className="w-3.5 h-3.5" /> Service
            </div>
            <div className="divide-y divide-border">
              {serviceRows.map((r) => (
                <div key={r.key} className="flex items-center gap-3 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{r.service.name}</div>
                    <button
                      onClick={() => onEventClick?.(r.event)}
                      className="text-xs text-primary hover:underline truncate block text-left"
                    >
                      {r.event.title}
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground text-right whitespace-nowrap shrink-0">
                    {fmt(r.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}