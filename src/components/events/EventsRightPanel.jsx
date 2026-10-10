import { ArrowRight, UserCheck, Clock } from "lucide-react";
import Button from "@/components/common/Button";
import { formatEventDates, isUpcomingDate } from "@/lib/dates";
import { useNavigate } from "react-router-dom";
import { useT } from "@/hooks/useT";

export default function EventsRightPanel({ events = [], onEventClick, term }) {
  const tm = term || {};
  const t = useT();
  const navigate = useNavigate();

  const upcoming = events
    .filter((e) => e.status === "upcoming" || (e.status === "in-progress" && isUpcomingDate(e.start_date)))
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-[15px] shadow-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
          <Clock className="w-4 h-4 text-accent shrink-0" strokeWidth={2} />
          <span className="truncate">{tm.activeWorkLabel || t("Upcoming Events")}</span>
        </div>
        <div className="space-y-1">
          {upcoming.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">{t("No")} {tm.activeWorkLabel?.toLowerCase() || t("upcoming events")}.</div>
          )}
          {upcoming.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick?.(e)}
              className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-muted/40 rounded -mx-1 px-1 transition-colors"
            >
              {/* Title and the event's actual dates share a row; when they don't fit they wrap to two lines. */}
              <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm text-foreground truncate max-w-full">{e.title}</span>
                <span className="text-xs text-muted-foreground">{formatEventDates(e)}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/team")}>
        <UserCheck className="w-4 h-4" />
        {tm.teamLabel || t("Team")} {t("Availability")}
      </Button>
    </div>
  );
}