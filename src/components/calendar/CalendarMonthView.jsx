import { useMemo } from "react";
import { toISODate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_COLORS = {
  upcoming: "bg-primary/10 text-primary border-primary/30",
  "in-progress": "bg-warning/10 text-warning border-warning/30",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function CalendarMonthView({ currentDate, eventsByDate, onDayClick, onEventClick }) {
  const grid = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(y, m, d, 12)));
    return cells;
  }, [currentDate]);

  const today = todayISO();

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground uppercase mb-2">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const dayEvents = eventsByDate[iso] || [];
          const isToday = iso === today;
          return (
            <button
              key={i}
              onClick={() => onDayClick?.(new Date(iso + "T12:00:00"))}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] rounded-lg border p-1.5 text-left transition-all flex flex-col gap-0.5 overflow-hidden",
                isToday ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <span className={cn(
                "text-xs font-semibold self-start",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {Number(iso.slice(8))}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick?.(ev); }}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer border",
                      STATUS_COLORS[ev.status] || STATUS_COLORS.upcoming
                    )}
                    title={ev.title}
                  >
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}