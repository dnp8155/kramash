import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, MapPin } from "lucide-react";
import { formatEventDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function CalendarSidePanel({ events, search }) {
  const navigate = useNavigate();

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);

    return events
      .filter((e) => e.status !== "cancelled")
      .filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.event_type?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
        );
      })
      .filter((e) => {
        const dates = Array.isArray(e.event_dates) && e.event_dates.length > 0
          ? e.event_dates
          : (e.start_date ? [e.start_date] : []);
        return dates.some((d) => d >= todayISO);
      })
      .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
      .slice(0, 8);
  }, [events, search]);

  return (
    <div className="w-full lg:w-72 shrink-0">
      <div className="bg-card border border-border rounded-lg p-4 sticky top-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {search ? "No matching events found." : "No upcoming events."}
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((ev) => (
              <button
                key={ev.id}
                onClick={() => navigate(`/events/${ev.id}`)}
                className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <div className="w-1 h-full min-h-[2.5rem] rounded-full bg-primary/30 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {ev.title}
                    </div>
                    {ev.event_type && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{ev.event_type}</div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                      <CalendarClock className="w-3 h-3 shrink-0" />
                      {formatEventDate(ev.start_date, ev.end_date)}
                    </div>
                    {ev.venue && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{ev.venue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}