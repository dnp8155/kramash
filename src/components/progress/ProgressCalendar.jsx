import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/common/Button";
import { toISODate } from "@/utils/dates";
import { getEventsForDate } from "@/utils/progress";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Month-grid calendar. Each cell shows the date number and the event/client
// name (not team member names). Cell background indicates booking density.
// Clicking a date calls onDateClick with the YYYY-MM-DD string.
export default function ProgressCalendar({ events, month, onMonthChange, onDateClick }) {
  const { year, month: m } = month;
  const firstDay = new Date(year, m, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = toISODate(new Date());

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }

  const shift = (delta) => {
    const newMonth = (m + delta + 12) % 12;
    const newYear = m + delta < 0 ? year - 1 : m + delta > 11 ? year + 1 : year;
    onMonthChange({ year: newYear, month: newMonth });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {monthNames[m]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              onMonthChange({ year: now.getFullYear(), month: now.getMonth() });
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-[10px] font-medium uppercase text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            return (
              <div
                key={i}
                className="min-h-[56px] rounded-lg border border-border/40 bg-muted/20 sm:min-h-[80px]"
              />
            );
          }
          const dayEvents = getEventsForDate(events, date);
          const count = dayEvents.length;
          const isToday = date === today;
          return (
            <button
              key={date}
              onClick={() => onDateClick(date)}
              className={`min-h-[56px] rounded-lg border p-1 text-left align-top transition-colors hover:border-primary/50 sm:min-h-[80px] ${
                count === 0
                  ? "border-border/40 bg-card"
                  : count === 1
                  ? "border-primary/30 bg-primary/5"
                  : "border-primary/40 bg-primary/10"
              } ${isToday ? "ring-2 ring-primary/40" : ""}`}
            >
              <span
                className={`text-[10px] font-semibold sm:text-xs ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {parseInt(date.split("-")[2], 10)}
              </span>
              {count > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  <p className="truncate text-[9px] font-medium text-foreground sm:text-[10px]">
                    {dayEvents[0].title}
                  </p>
                  {count > 1 && (
                    <p className="text-[9px] text-muted-foreground sm:text-[10px]">
                      +{count - 1} more
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}