import { useState, useMemo } from "react";
import { parseISODate, toISODate, todayISO } from "@/lib/dates";
import { splitAvailability, isBlockedOnDate } from "@/lib/teamService";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MousePointerClick, Ban } from "lucide-react";
import DayBookingsPopup from "@/components/team/DayBookingsPopup";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AvailabilityCalendar({ members = [], assignments = [], eventsById = {}, blockDates = [], onEventClick, onBlockDate, currency = "INR" }) {
  const [view, setView] = useState(() => {
    // Default to the month of the nearest upcoming booking, if any.
    const now = new Date();
    let target = now;
    for (const a of assignments) {
      if (a.assignment_status === "removed") continue;
      const ev = eventsById[a.event_id];
      if (!ev || ev.status === "cancelled") continue;
      const start = parseISODate(ev.start_date);
      if (start && start >= now && (target === now || start < target)) {
        target = start;
      }
    }
    return { y: target.getFullYear(), m: target.getMonth() };
  });
  const [selected, setSelected] = useState(null);
  const [popupDate, setPopupDate] = useState(null);

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
  // Uses event_dates (specific shoot days) when available, otherwise the
  // per-member booking date range, falling back to event start/end.
  const bookingsByDate = useMemo(() => {
    const map = {};
    const addDate = (iso, m, ev, a) => {
      if (!map[iso]) map[iso] = [];
      if (!map[iso].some((b) => b.event?.id === ev.id && b.member.id === m.id)) {
        map[iso].push({ member: m, event: ev, assignment: a });
      }
    };
    for (const m of members) {
      if (m.status === "inactive") continue;
      for (const a of assignments) {
        if (a.team_member_id !== m.id || a.assignment_status === "removed") continue;
        const ev = eventsById[a.event_id];
        if (!ev || ev.status === "cancelled") continue;
        // Prefer event_dates (non-consecutive shoot days) when present
        const evDates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0
          ? ev.event_dates
          : null;
        if (evDates) {
          for (const d of evDates) addDate(d, m, ev, a);
        } else {
          // Per-member booking range, else event start/end
          const start = a.booking_start_date || ev.start_date;
          const end = a.booking_end_date || ev.end_date || start;
          let cur = parseISODate(start);
          const endD = parseISODate(end);
          if (!cur || !endD) continue;
          while (cur <= endD) {
            addDate(toISODate(cur), m, ev, a);
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    }
    return map;
  }, [members, assignments, eventsById]);

  // Map: dateISO -> array of { member, block } for blocked members.
  const blockedByDate = useMemo(() => {
    const map = {};
    for (const b of blockDates) {
      if (b.status === "cancelled") continue;
      const m = members.find((mm) => mm.id === b.team_member_id);
      if (!m || m.status === "inactive") continue;
      let cur = parseISODate(b.start_date);
      const endD = parseISODate(b.end_date || b.start_date);
      if (!cur || !endD) continue;
      while (cur <= endD) {
        const iso = toISODate(cur);
        if (!map[iso]) map[iso] = [];
        if (!map[iso].some((x) => x.member.id === m.id)) {
          map[iso].push({ member: m, block: b });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [members, blockDates]);

  const selectedInfo = useMemo(() => {
    if (!selected) return null;
    return splitAvailability(members, selected, assignments, eventsById, blockDates);
  }, [members, selected, assignments, eventsById, blockDates]);

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
            const blocked = blockedByDate[iso] || [];
            const hasMultiple = booked.length > 1;
            const hasBooked = booked.length > 0;
            const hasBlocked = blocked.length > 0;

            return (
              <button
                key={i}
                onClick={() => {
                  setSelected(iso);
                  const booked = bookingsByDate[iso] || [];
                  const blocked = blockedByDate[iso] || [];
                  if (booked.length > 0 || blocked.length > 0) {
                    setPopupDate(iso);
                  }
                }}
                className={cn(
                  "relative h-24 rounded-lg text-xs border-2 transition-all flex flex-col items-stretch justify-start gap-0.5 p-1 overflow-hidden",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : hasMultiple
                    ? "border-[#f39c12] bg-[#f39c12]/5 hover:border-[#f39c12]"
                    : hasBooked
                    ? "border-[#e74c3c] bg-[#e74c3c]/5 hover:border-[#e74c3c]"
                    : hasBlocked
                    ? "border-[#6b7280] bg-[#6b7280]/5 hover:border-[#6b7280]"
                    : "border-[#27ae60] bg-[#27ae60]/5 hover:border-[#27ae60]",
                  isToday && !isSelected && "ring-2 ring-primary/30"
                )}
              >
                <span className={cn(
                  "font-semibold text-[11px] leading-none self-center",
                  hasMultiple ? "text-[#d97706]" : hasBooked ? "text-[#e74c3c]" : hasBlocked ? "text-[#6b7280]" : "text-[#27ae60]"
                )}>
                  {day}
                </span>
                {hasBooked && (
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden mt-0.5">
                    {booked.slice(0, 3).map((b) => (
                      <span
                        key={b.member.id}
                        title={`${b.member.name} — ${b.event?.title || ""}`}
                        className={cn(
                          "text-[9px] font-medium px-1 py-0.5 rounded leading-tight truncate",
                          hasMultiple ? "bg-[#f39c12]/15 text-[#d97706]" : "bg-[#e74c3c]/15 text-[#e74c3c]"
                        )}
                      >
                        {b.member.name.split(" ")[0]}
                      </span>
                    ))}
                    {booked.length > 3 && (
                      <span className="text-[9px] font-semibold text-[#d97706] leading-tight px-1">+{booked.length - 3} more</span>
                    )}
                  </div>
                )}
                {!hasBooked && hasBlocked && (
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden mt-0.5">
                    {blocked.slice(0, 2).map((b) => (
                      <span
                        key={b.member.id}
                        title={`${b.member.name} — ${b.block?.reason || "Blocked"}`}
                        className="text-[9px] font-medium px-1 py-0.5 rounded leading-tight truncate bg-[#6b7280]/15 text-[#6b7280] flex items-center gap-0.5"
                      >
                        <Ban className="w-2 h-2 shrink-0" />
                        {b.member.name.split(" ")[0]}
                      </span>
                    ))}
                    {blocked.length > 2 && (
                      <span className="text-[9px] font-semibold text-[#6b7280] leading-tight px-1">+{blocked.length - 2}</span>
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
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6b7280]" /> Blocked / Leave
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
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {parseISODate(selected)
                  ? parseISODate(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
                  : selected}
              </div>
              {onBlockDate && (
                <button
                  onClick={() => onBlockDate(selected)}
                  className="text-xs font-medium text-warning hover:underline flex items-center gap-1"
                >
                  <Ban className="w-3 h-3" /> Block
                </button>
              )}
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

              {selectedInfo.blocked.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Blocked ({selectedInfo.blocked.length})
                  </div>
                  <ul className="space-y-1.5 pl-3.5">
                    {selectedInfo.blocked.map(({ member, block }) => (
                      <li key={member.id} className="text-sm">
                        <span className="text-foreground font-medium">{member.name}</span>
                        {block?.reason ? <span className="text-muted-foreground"> — {block.reason}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Day bookings popup */}
      {popupDate && (
        <DayBookingsPopup
          date={popupDate}
          bookings={bookingsByDate[popupDate] || []}
          blocks={blockedByDate[popupDate] || []}
          currency={currency}
          onClose={() => setPopupDate(null)}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}