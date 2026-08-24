import { useState } from "react";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import { formatEventDate, isThisWeek, isUpcomingDate } from "@/lib/dates";

export default function ReminderBanner({ events = [], onEventClick }) {
  const [open, setOpen] = useState(false);

  const reminders = events
    .filter((e) => isThisWeek(e.start_date) && isUpcomingDate(e.start_date) && e.status !== "cancelled")
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1));

  return (
    <div className="bg-muted/60 border border-border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <Bell className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">Reminders</span>
        {reminders.length > 0 && (
          <span className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {reminders.length}
          </span>
        )}
        <span className="ml-auto text-muted-foreground text-sm">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-muted-foreground">
          {reminders.length === 0 ? (
            <p>No pending reminders for this week.</p>
          ) : (
            <div className="space-y-1.5">
              {reminders.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onEventClick?.(e)}
                  className="flex items-center gap-2 w-full text-left hover:text-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-foreground font-medium flex-1 truncate">{e.title}</span>
                  <span>{formatEventDate(e.start_date, e.end_date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}