import { CalendarPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadIcs, googleCalendarUrl, eventDays } from "@/lib/calendarLinks";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

// A small optional "Add to calendar" button for the portals. The file (Apple Calendar, Outlook, Google) adds every day at
// once, each as its own entry like the By date plan. Google Calendar takes one entry at a time, so with several days
// each day has its own link.
export default function AddToCalendar({ event, label = "Add to calendar", className }) {
  const days = event ? eventDays(event) : [];
  if (days.length === 0) return null;
  const many = days.length > 1;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors", className)}>
          <CalendarPlus className="w-3.5 h-3.5 text-primary" /> {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <button type="button" onClick={() => downloadIcs(event, event.title)} className="w-full text-left px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-muted">
          Apple / Outlook (.ics file)
          <span className="block text-[11px] text-muted-foreground">{many ? `All ${days.length} days at once · also works with Google` : "Also works with Google"}</span>
        </button>
        <div className="mt-1 pt-1 border-t border-border">
          <div className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground">Google Calendar</div>
          {days.map((d, i) => (
            <a key={d.date} href={googleCalendarUrl(event, d.date)} target="_blank" rel="noopener noreferrer" className="block px-2.5 py-1.5 rounded-md text-sm text-foreground hover:bg-muted">
              {many ? `Day ${i + 1} · ${formatDate(d.date)}` : "Open in Google Calendar"}
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
