import { useMemo } from "react";
import { toISODate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarYearView({ currentDate, eventsByDate, onMonthClick }) {
  const year = currentDate.getFullYear();
  const today = todayISO();

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const first = new Date(year, m, 1);
      const startOffset = first.getDay();
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < startOffset; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, m, d, 12)));
      return { month: m, cells, eventCount: cells.filter((iso) => iso && (eventsByDate[iso] || []).length > 0).length };
    });
  }, [year, eventsByDate]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {months.map(({ month, cells, eventCount }) => (
        <button
          key={month}
          onClick={() => onMonthClick?.(new Date(year, month, 1))}
          className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary/30 hover:shadow-card transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{MONTHS[month]}</h3>
            {eventCount > 0 && <span className="text-[10px] text-muted-foreground">{eventCount} days</span>}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w, i) => <div key={i} className="text-[8px] text-muted-foreground font-medium">{w}</div>)}
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const hasEvents = (eventsByDate[iso] || []).length > 0;
              const isToday = iso === today;
              return (
                <div
                  key={i}
                  className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-[8px] relative",
                    isToday ? "bg-primary text-primary-foreground font-bold" : hasEvents ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  {isToday && <span className="cal-today-dot absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent border border-card" />}
                  {Number(iso.slice(8))}
                </div>
              );
            })}
          </div>
        </button>
      ))}
    </div>
  );
}