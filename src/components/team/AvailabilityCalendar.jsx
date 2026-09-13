import { useState, useMemo, useEffect } from "react";
import { parseISODate, toISODate, todayISO } from "@/lib/dates";
import { splitAvailability } from "@/lib/teamService";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MousePointerClick, Ban, CalendarDays, Crown, Unlock } from "lucide-react";
import CalendarEventDetailPanel from "@/components/team/CalendarEventDetailPanel";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AvailabilityCalendar({
  members = [], assignments = [], eventsById = {}, blockDates = [],
  serviceAssignments = [], dayAssignments = [], services = [],
  onEventClick, onBlockDate, onUnblockDate, currency = "INR"
}) {
  const allEvents = useMemo(() => Object.values(eventsById || {}).filter((e) => e && e.status !== "cancelled"), [eventsById]);

  const [view, setView] = useState(() => {
    const now = new Date();
    let target = now;
    for (const ev of allEvents) {
      const dates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0
        ? ev.event_dates
        : (ev.start_date ? [ev.start_date] : []);
      for (const d of dates) {
        const dt = parseISODate(d);
        if (dt && dt >= now && (target === now || dt < target)) target = dt;
      }
    }
    return { y: target.getFullYear(), m: target.getMonth() };
  });
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // month | week | day
  const [weekRef, setWeekRef] = useState(() => toISODate(new Date())); // anchor date for week view
  const [dayRef, setDayRef] = useState(() => toISODate(new Date())); // anchor date for day view

  // In day view, auto-select the referenced day so the right panel stays in sync
  useEffect(() => {
    if (viewMode === "day") setSelected(dayRef);
  }, [viewMode, dayRef]);

  // Build the calendar grid (Sunday-first) for the viewed month.
  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(view.y, view.m, d, 12);
      cells.push(toISODate(date));
    }
    return cells;
  }, [view]);

  // Week grid — 7 days starting Sunday of the week containing weekRef
  const weekGrid = useMemo(() => {
    const ref = parseISODate(weekRef) || new Date();
    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay()); // Sunday
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(toISODate(d));
    }
    return cells;
  }, [weekRef]);

  // Map: dateISO → array of events on that date.
  // Uses event_dates (non-consecutive shoot days) when available, otherwise the
  // event start/end range.
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of allEvents) {
      const dates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0
        ? ev.event_dates
        : null;
      if (dates) {
        for (const d of dates) {
          if (!map[d]) map[d] = [];
          if (!map[d].some((e) => e.id === ev.id)) map[d].push(ev);
        }
      } else if (ev.start_date) {
        const start = ev.start_date;
        const end = ev.end_date || start;
        let cur = parseISODate(start);
        const endD = parseISODate(end);
        if (!cur || !endD) continue;
        while (cur <= endD) {
          const iso = toISODate(cur);
          if (!map[iso]) map[iso] = [];
          if (!map[iso].some((e) => e.id === ev.id)) map[iso].push(ev);
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return map;
  }, [allEvents]);

  // Map: dateISO → array of { member, block } for blocked members.
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

  const selectedEvents = selected ? (eventsByDate[selected] || []) : [];
  const selectedBlocked = selected ? (blockedByDate[selected] || []) : [];

  // Upcoming events (today onwards) for the right panel default state
  const upcomingEvents = useMemo(() => {
    const today = todayISO();
    const rows = [];
    for (const ev of allEvents) {
      const dates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0
        ? ev.event_dates
        : (ev.start_date ? [ev.start_date] : []);
      for (const d of dates) {
        if (d >= today) {
          rows.push({ event: ev, date: d });
        }
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || (a.event.title || "").localeCompare(b.event.title || ""));
    return rows.slice(0, 8);
  }, [allEvents]);

  const fmtUpcoming = (s) => {
    try {
      return new Date(s + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    } catch { return s; }
  };

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

  const prevWeek = () => {
    const d = parseISODate(weekRef) || new Date();
    d.setDate(d.getDate() - 7);
    setWeekRef(toISODate(d));
  };
  const nextWeek = () => {
    const d = parseISODate(weekRef) || new Date();
    d.setDate(d.getDate() + 7);
    setWeekRef(toISODate(d));
  };
  const prevDay = () => {
    const d = parseISODate(dayRef) || new Date();
    d.setDate(d.getDate() - 1);
    setDayRef(toISODate(d));
  };
  const nextDay = () => {
    const d = parseISODate(dayRef) || new Date();
    d.setDate(d.getDate() + 1);
    setDayRef(toISODate(d));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
      {/* Calendar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        {/* View mode toggle + Navigation */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
            {["month", "week", "day"].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                  viewMode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {viewMode === "month" && (
              <>
                <button onClick={prevYear} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Previous year">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Previous month">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-bold text-foreground px-2 min-w-[140px] text-center">{MONTHS[view.m]} {view.y}</h3>
                <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Next month">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={nextYear} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Next year">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </>
            )}
            {viewMode === "week" && (
              <>
                <button onClick={prevWeek} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Previous week">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-bold text-foreground px-2 min-w-[180px] text-center">
                  {(() => {
                    const d0 = parseISODate(weekGrid[0]);
                    const d1 = parseISODate(weekGrid[6]);
                    return `${d0.getDate()} ${MONTHS[d0.getMonth()].slice(0, 3)} – ${d1.getDate()} ${MONTHS[d1.getMonth()].slice(0, 3)} ${d1.getFullYear()}`;
                  })()}
                </h3>
                <button onClick={nextWeek} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Next week">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {viewMode === "day" && (
              <>
                <button onClick={prevDay} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Previous day">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-bold text-foreground px-2 min-w-[160px] text-center">
                  {(() => {
                    const d = parseISODate(dayRef);
                    return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
                  })()}
                </h3>
                <button onClick={nextDay} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors" aria-label="Next day">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Weekday headers (month + week) */}
        {viewMode !== "day" && (
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase mb-2">
            {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
          </div>
        )}

        {/* Month view */}
        {viewMode === "month" && (
          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const day = Number(iso.slice(8));
              const isToday = iso === todayISO();
              const isSelected = iso === selected;
              const dayEvents = eventsByDate[iso] || [];
              const blocked = blockedByDate[iso] || [];
              const hasMultiple = dayEvents.length > 1;
              const hasBooked = dayEvents.length > 0;
              const hasBlocked = blocked.length > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelected(iso)}
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
                      {dayEvents.slice(0, 2).map((ev) => (
                        <span
                          key={ev.id}
                          title={ev.title}
                          className={cn(
                            "text-[9px] font-medium px-1 py-0.5 rounded leading-tight truncate",
                            hasMultiple ? "bg-[#f39c12]/15 text-[#d97706]" : "bg-[#e74c3c]/15 text-[#e74c3c]"
                          )}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] font-semibold text-[#d97706] leading-tight px-1">+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  )}
                  {!hasBooked && hasBlocked && (
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden mt-0.5">
                      {blocked.slice(0, 1).map((b) => (
                        <span
                          key={b.member.id}
                          title={`${b.member.name} — ${b.block?.reason || "Blocked"}`}
                          className="text-[9px] font-medium px-1 py-0.5 rounded leading-tight truncate bg-[#6b7280]/15 text-[#6b7280] flex items-center gap-0.5"
                        >
                          <Ban className="w-2 h-2 shrink-0" />
                          {b.member.name.split(" ")[0]}
                        </span>
                      ))}
                      {blocked.length > 1 && (
                        <span className="text-[9px] font-semibold text-[#6b7280] leading-tight px-1">+{blocked.length - 1}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Week view */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 gap-1.5">
            {weekGrid.map((iso) => {
              const day = Number(iso.slice(8));
              const isToday = iso === todayISO();
              const isSelected = iso === selected;
              const dayEvents = eventsByDate[iso] || [];
              const blocked = blockedByDate[iso] || [];
              const hasMultiple = dayEvents.length > 1;
              const hasBooked = dayEvents.length > 0;
              const hasBlocked = blocked.length > 0;

              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "relative h-48 rounded-lg text-xs border-2 transition-all flex flex-col items-stretch justify-start gap-0.5 p-1.5 overflow-hidden",
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
                    "font-semibold text-xs leading-none self-center",
                    hasMultiple ? "text-[#d97706]" : hasBooked ? "text-[#e74c3c]" : hasBlocked ? "text-[#6b7280]" : "text-[#27ae60]"
                  )}>
                    {day}
                  </span>
                  {hasBooked && (
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden mt-1">
                      {dayEvents.slice(0, 4).map((ev) => (
                        <span
                          key={ev.id}
                          title={ev.title}
                          className={cn(
                            "text-[9px] font-medium px-1 py-0.5 rounded leading-tight truncate",
                            hasMultiple ? "bg-[#f39c12]/15 text-[#d97706]" : "bg-[#e74c3c]/15 text-[#e74c3c]"
                          )}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {dayEvents.length > 4 && (
                        <span className="text-[9px] font-semibold text-[#d97706] leading-tight px-1">+{dayEvents.length - 4} more</span>
                      )}
                    </div>
                  )}
                  {!hasBooked && hasBlocked && (
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden mt-1">
                      {blocked.slice(0, 3).map((b) => (
                        <span
                          key={b.member.id}
                          title={`${b.member.name} — ${b.block?.reason || "Blocked"}`}
                          className="text-[9px] font-medium px-1 py-0.5 rounded leading-tight truncate bg-[#6b7280]/15 text-[#6b7280] flex items-center gap-0.5"
                        >
                          <Ban className="w-2 h-2 shrink-0" />
                          {b.member.name.split(" ")[0]}
                        </span>
                      ))}
                      {blocked.length > 3 && (
                        <span className="text-[9px] font-semibold text-[#6b7280] leading-tight px-1">+{blocked.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Day view */}
        {viewMode === "day" && (() => {
          const iso = dayRef;
          const isToday = iso === todayISO();
          const dayEvents = eventsByDate[iso] || [];
          const blocked = blockedByDate[iso] || [];
          const dayInfo = splitAvailability(members, iso, assignments, eventsById, blockDates);
          return (
            <div>
              <button
                onClick={() => setSelected(iso)}
                className={cn(
                  "w-full rounded-lg border-2 p-3 mb-3 text-left transition-all",
                  isToday ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="text-sm font-bold text-foreground">
                  {WEEKDAYS_SHORT[parseISODate(iso).getDay()]}, {parseISODate(iso).getDate()} {MONTHS[parseISODate(iso).getMonth()]}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {dayEvents.length} event(s) · {blocked.length} blocked · {dayInfo.available.length} available
                </div>
              </button>

              <div className="space-y-3">
                {dayEvents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#e74c3c]" /> Events ({dayEvents.length})
                    </div>
                    <div className="space-y-1.5">
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => onEventClick?.(ev)}
                          className="w-full text-left text-sm px-3 py-2 rounded-lg border border-[#e74c3c]/20 bg-[#e74c3c]/5 hover:bg-[#e74c3c]/10 transition-colors truncate"
                        >
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {dayInfo.available.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#27ae60]" /> Available ({dayInfo.available.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dayInfo.available.map((m) => (
                        <span key={m.id} className="text-xs px-2 py-1 rounded-full bg-[#27ae60]/10 text-[#27ae60] border border-[#27ae60]/20">
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {dayInfo.blocked.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Blocked ({dayInfo.blocked.length})
                    </div>
                    <div className="space-y-1.5">
                      {dayInfo.blocked.map(({ member, block }) => (
                        <div key={member.id} className="flex items-center justify-between gap-2 text-sm px-3 py-1.5 rounded-lg bg-[#6b7280]/5 border border-[#6b7280]/15">
                          <span className="min-w-0">
                            <span className="text-foreground font-medium">{member.name}</span>
                            {block?.reason ? <span className="text-muted-foreground"> — {block.reason}</span> : null}
                          </span>
                          {onUnblockDate && block?.id && (
                            <button
                              onClick={() => onUnblockDate(block.id)}
                              className="text-xs font-medium text-success hover:underline shrink-0 flex items-center gap-0.5"
                            >
                              <Unlock className="w-3 h-3" /> Unblock
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dayEvents.length === 0 && dayInfo.available.length === 0 && dayInfo.blocked.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nothing scheduled.</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
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

      {/* Selected date detail / upcoming events */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        {!selected ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">Upcoming Events</h3>
              {upcomingEvents.length > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">{upcomingEvents.length}</span>
              )}
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MousePointerClick className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Tap a date</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  No upcoming events. Pick a day on the calendar to see details.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto -mr-1 pr-1">
                {upcomingEvents.map(({ event: ev, date }) => (
                  <button
                    key={`${ev.id}-${date}`}
                    onClick={() => onEventClick?.(ev)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-primary/10 text-primary shrink-0">
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {new Date(date + "T12:00:00").toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-none mt-0.5">
                        {Number(date.slice(8))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {ev.event_type || "Event"} {ev.venue ? `· ${ev.venue}` : ""}
                      </div>
                    </div>
                    {ev.status === "upcoming" && (
                      <span className="w-2 h-2 rounded-full bg-[#27ae60] shrink-0" title="Upcoming" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : selectedEvents.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
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
            <CalendarEventDetailPanel
              date={selected}
              events={selectedEvents}
              members={members}
              assignments={assignments}
              serviceAssignments={serviceAssignments}
              dayAssignments={dayAssignments}
              services={services}
              onEventClick={onEventClick}
            />
            {selectedBlocked.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Blocked ({selectedBlocked.length})
                </div>
                <ul className="space-y-1.5">
                  {selectedBlocked.map(({ member, block }) => (
                    <li key={member.id} className="text-sm flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="text-foreground font-medium">{member.name}</span>
                        {block?.reason ? <span className="text-muted-foreground"> — {block.reason}</span> : null}
                      </span>
                      {onUnblockDate && block?.id && (
                        <button
                          onClick={() => onUnblockDate(block.id)}
                          className="text-xs font-medium text-success hover:underline shrink-0 flex items-center gap-0.5"
                        >
                          <Unlock className="w-3 h-3" /> Unblock
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

              {selectedInfo.blocked.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Blocked ({selectedInfo.blocked.length})
                  </div>
                  <ul className="space-y-1.5 pl-3.5">
                    {selectedInfo.blocked.map(({ member, block }) => (
                      <li key={member.id} className="text-sm flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="text-foreground font-medium">{member.name}</span>
                          {block?.reason ? <span className="text-muted-foreground"> — {block.reason}</span> : null}
                        </span>
                        {onUnblockDate && block?.id && (
                          <button
                            onClick={() => onUnblockDate(block.id)}
                            className="text-xs font-medium text-success hover:underline shrink-0 flex items-center gap-0.5"
                            title="Unblock this member"
                          >
                            <Unlock className="w-3 h-3" /> Unblock
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}