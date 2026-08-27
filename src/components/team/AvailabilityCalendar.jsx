import { useState, useMemo } from "react";
import { parseISODate, toISODate, todayISO } from "@/lib/dates";
import { splitAvailability } from "@/lib/teamService";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AvailabilityCalendar({ members = [], assignments = [], eventsById = {}, onEventClick }) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(null);

  // Build the calendar grid (Sunday-first) for the viewed month.
  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startOffset = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(view.y, view.m, d, 12);
      cells.push(toISODate(date));
    }
    return cells;
  }, [view]);

  // Map: dateISO -> array of { member, event } for booked members.
  const bookingsByDate = useMemo(() => {
    const map = {};
    for (const m of members) {
      if (m.status === "inactive") continue;
      for (const a of assignments) {
        if (a.team_member_id !== m.id || a.assignment_status === "removed") continue;
        const ev = eventsById[a.event_id];
        if (!ev || ev.status === "cancelled") continue;
        const end = ev.end_date || ev.start_date;
        let cur = parseISODate(ev.start_date);
        const endD = parseISODate(end);
        if (!cur || !endD) continue;
        while (cur <= endD) {
          const iso = toISODate(cur);
          if (!map[iso]) map[iso] = [];
          // Avoid duplicate event entries on the same day.
          if (!map[iso].some((b) => b.event?.id === ev.id)) {
            map[iso].push({ member: m, event: ev });
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return map;
  }, [members, assignments, eventsById]);

  const selectedInfo = useMemo(() => {
    if (!selected) return null;
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
  const prevYear = () => setView((v) => ({ y: v.y - 1, m: v.m }));
  const nextYear = () => setView((v) => ({ y: v.y + 1, m: v.m }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Calendar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        {/* Navigation */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button onClick={prevYear} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Previous year">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-bold text-foreground px-4 min-w-[160px] text-center">{MONTHS[view.m]} {view.y}</h3>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={nextYear} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Next year">
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase mb-2">
          {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const day = Number(iso.slice(8));
            const isToday = iso === todayISO();
            const isSelected = iso === selected;
            const booked = bookingsByDate[iso] || [];
            const hasMultiple = booked.length > 1;
            const hasBooked = booked.length > 0;

            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                className={cn(
                  "relative h-14 rounded-lg text-xs border-2 transition-all flex flex-col items-center justify-center gap-0.5",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : hasMultiple
                    ? "border-[#f39c12] bg-[#f39c12]/5 hover:border-[#f39c12]"
                    : hasBooked
                    ? "border-[#e74c3c] bg-[#e74c3c]/5 hover:border-[#e74c3c]"
                    : "border-[#27ae60] bg-[#27ae60]/5 hover:border-[#27ae60]",
                  isToday && !isSelected && "ring-2 ring-primary/30"
                )}
              >
                <span className={cn(
                  "font-semibold",
                  hasMultiple ? "text-[#d97706]" : hasBooked ? "text-[#e74c3c]" : "text-[#27ae60]"
                )}>
                  {day}
                </span>
                {hasBooked && (
                  <div className="flex flex-wrap items-center justify-center gap-0.5 px-1 w-full overflow-hidden">
                    {booked.slice(0, 2).map((b) => (
                      <span
                        key={b.member.id}
                        title={`${b.member.name} — ${b.event?.title || ""}`}
                        className={cn(
                          "text-[7px] font-semibold px-1 py-0.5 rounded leading-none truncate max-w-[44px]",
                          hasMultiple ? "bg-[#f39c12]/15 text-[#d97706]" : "bg-[#e74c3c]/15 text-[#e74c3c]"
                        )}
                      >
                        {b.member.name.split(" ")[0]}
                      </span>
                    ))}
                    {booked.length > 2 && (
                      <span className="text-[7px] font-semibold text-[#d97706] leading-none">+{booked.length - 2}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#27ae60]" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e74c3c]" /> Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f39c12]" /> Multiple Bookings
          </span>
        </div>
      </div>

      {/* Selected date detail / empty state */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        {!selected ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <MousePointerClick className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Tap a date</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Pick a day on the calendar to see what's booked.
            </p>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {parseISODate(selected)
                ? parseISODate(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
                : selected}
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#27ae60]" /> Available ({selectedInfo.available.length})
                </div>
                {selectedInfo.available.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-3.5">No available team members.</p>
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
                  <span className="w-2 h-2 rounded-full bg-[#e74c3c]" /> Booked ({selectedInfo.booked.length})
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
          </>
        )}
      </div>
    </div>
  );
}