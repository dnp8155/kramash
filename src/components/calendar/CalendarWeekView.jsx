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

export default function CalendarWeekView({ currentDate, eventsByDate, onDayClick, onEventClick }) {
  const weekDays = useMemo(() => {
    const day = (currentDate.getDay() + 6) % 7;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { iso: toISODate(d), date: d, weekday: WEEKDAYS[d.getDay()] };
    });
  }, [currentDate]);

  const today = todayISO();

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(({ iso, date, weekday }) => {
          const dayEvents = eventsByDate[iso] || [];
          const isToday = iso === today;
          return (
            <div key={iso} className="min-h-[300px]">
              <button
                onClick={() => onDayClick?.(date)}
                className={cn(
                  "w-full text-center py-2 rounded-lg mb-2 border transition-colors relative",
                  isToday ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                )}
              >
                {isToday && <span className="cal-today-dot absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />}
                <div className="text-[10px] font-semibold uppercase">{weekday}</div>
                <div className="text-lg font-bold">{date.getDate()}</div>
              </button>
              <div className="space-y-1.5">
                {dayEvents.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No events</p>
                ) : (
                  dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick?.(ev)}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded-md border truncate",
                        STATUS_COLORS[ev.status] || STATUS_COLORS.upcoming
                      )}
                      title={ev.title}
                    >
                      {ev.title}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}