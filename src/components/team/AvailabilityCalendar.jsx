import { useState, useMemo } from "react";
import { parseISODate, toISODate, todayISO, formatEventDate } from "@/lib/dates";
import { splitAvailability } from "@/lib/teamService";
import { AVAILABILITY_STATUS } from "@/constants/teamConfig";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AvailabilityCalendar({ members = [], assignments = [], eventsById = {}, onEventClick }) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(todayISO());

  // Build the calendar grid (Monday-first) for the viewed month.
  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startOffset = (first.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(view.y, view.m, d, 12);
      cells.push(toISODate(date));
    }
    return cells;
  }, [view]);

  // Map: dateISO -> count of booked members (for the dot indicator).
  const bookingsByDate = useMemo(() => {
    const map = {};
    for (const m of members) {
      if (m.status === "inactive") continue;
      for (const a of assignments) {
        if (a.team_member_id !== m.id || a.assignment_status === "removed") continue;
        const ev = eventsById[a.event_id];
        if (!ev || ev.status === "cancelled") continue;
        const end = ev.end_date || ev.start_date;
        // mark every day in the event range
        let cur = parseISODate(ev.start_date);
        const endD = parseISODate(end);
        if (!cur || !endD) continue;
        while (cur <= endD) {
          const iso = toISODate(cur);
          if (!map[iso]) map[iso] = [];
          map[iso].push(m.name);
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return map;
  }, [members, assignments, eventsById]);

  const selectedInfo = useMemo(() => {
    return splitAvailability(members, selected, assignments, eventsById);
  }, [members, selected, assignments, eventsById]);

  const prevMonth = () => setView((v) => {
    const m = v.m - 1;
    return m < 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m };
  });
  const nextMonth = () => setView((v) => {
    const m = v.m + 1;
    return m > 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Calendar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold">{MONTHS[view.m]} {view.y}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground uppercase mb-1">
          {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const day = Number(iso.slice(8));
            const isToday = iso === todayISO();
            const isSelected = iso === selected;
            const booked = bookingsByDate[iso] || [];
            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                className={cn(
                  "relative h-12 rounded-md text-xs border transition-colors",
                  isSelected ? "border-primary bg-primary/5 text-foreground font-semibold"
                    : "border-border hover:bg-muted/50 text-foreground",
                  isToday && !isSelected && "ring-1 ring-primary/40"
                )}
              >
                <span className="absolute top-1 left-1.5">{day}</span>
                {booked.length > 0 && (
                  <span className="absolute bottom-1 right-1 flex gap-0.5">
                    {booked.slice(0, 3).map((_, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Booked</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Available</span>
        </div>
      </div>

      {/* Selected date detail */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {parseISODate(selected)
            ? parseISODate(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
            : selected}
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Available ({selectedInfo.available.length})
            </div>
            {selectedInfo.available.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-3.5">No available team members found for this date.</p>
            ) : (
              <ul className="space-y-1 pl-3.5">
                {selectedInfo.available.map((m) => (
                  <li key={m.id} className="text-sm text-foreground">{m.name}{m.profession ? ` — ${m.profession}` : ""}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Booked ({selectedInfo.booked.length})
            </div>
            {selectedInfo.booked.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-3.5">No bookings on this date.</p>
            ) : (
              <ul className="space-y-1.5 pl-3.5">
                {selectedInfo.booked.map(({ member, event: ev }) => (
                  <li key={member.id} className="text-sm">
                    <span className="text-foreground font-medium">{member.name}</span>
                    {ev ? (
                      <button
                        onClick={() => onEventClick?.(ev)}
                        className="ml-1 text-primary hover:underline"
                      >
                        — {ev.title}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}