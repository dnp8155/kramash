import { useMemo } from "react";
import { todayISO, formatEventDate } from "@/lib/dates";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UpcomingBookingsList({ members = [], assignments = [], eventsById = {}, onEventClick }) {
  const rows = useMemo(() => {
    const today = todayISO();
    const out = [];
    for (const a of assignments) {
      if (a.assignment_status === "removed") continue;
      const ev = eventsById[a.event_id];
      if (!ev || ev.status === "cancelled") continue;
      const m = members.find((x) => x.id === a.team_member_id);
      if (!m) continue;
      // Per-member booking dates, fall back to event dates
      const start = a.booking_start_date || ev.start_date;
      const end = a.booking_end_date || ev.end_date || start;
      if (end < today) continue; // skip past
      out.push({
        key: a.id,
        member: m,
        event: ev,
        start,
        end
      });
    }
    out.sort((a, b) => a.start.localeCompare(b.start) || a.member.name.localeCompare(b.member.name));
    return out.slice(0, 30);
  }, [members, assignments, eventsById]);

  const fmt = (s, e) => formatEventDate(s, e);

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Upcoming Bookings</h3>
        </div>
        <p className="text-sm text-muted-foreground py-6 text-center">No upcoming bookings. Assign team members to events to see them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">Upcoming Bookings</h3>
        <span className="text-xs text-muted-foreground ml-auto">{rows.length} upcoming</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {r.member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">{r.member.name}</div>
              <button
                onClick={() => onEventClick?.(r.event)}
                className="text-xs text-primary hover:underline truncate block text-left"
              >
                {r.event.title}
              </button>
            </div>
            <div className="text-xs text-muted-foreground text-right whitespace-nowrap shrink-0">
              {fmt(r.start, r.end)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}