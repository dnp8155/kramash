import { toISODate, todayISO } from "@/lib/dates";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATUS_BADGE = {
  upcoming: "bg-primary/10 text-primary",
  "in-progress": "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function CalendarDayView({ currentDate, eventsByDate, onEventClick }) {
  const iso = toISODate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12));
  const dayEvents = eventsByDate[iso] || [];
  const isToday = iso === todayISO();

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">
          {currentDate.getDate()} {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          {isToday && <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">Today</span>}
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentDate.toLocaleDateString("en-IN", { weekday: "long" })} · {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No events on this day.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onEventClick?.(ev)}
              className="w-full flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-colors text-left"
            >
              <div className={cn("w-1.5 h-12 rounded-full", ev.status === "completed" ? "bg-success" : ev.status === "in-progress" ? "bg-warning" : "bg-primary")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{ev.title}</h3>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded capitalize", STATUS_BADGE[ev.status] || STATUS_BADGE.upcoming)}>
                    {ev.status?.replace("-", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {ev.venue && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{ev.venue}</span>}
                  {ev.team_member_ids?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.team_member_ids.length} team</span>}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}