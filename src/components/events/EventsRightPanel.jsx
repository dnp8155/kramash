import { ArrowRight, Users } from "lucide-react";
import Button from "@/components/common/Button";
import { formatEventDate, isUpcomingDate } from "@/lib/dates";
import { useNavigate } from "react-router-dom";

export default function EventsRightPanel({ events = [], onEventClick, term }) {
  const t = term || {};
  const navigate = useNavigate();

  const upcoming = events
    .filter((e) => e.status === "upcoming" || (e.status === "in-progress" && isUpcomingDate(e.start_date)))
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-sm font-semibold text-foreground mb-2">
          {t.activeWorkLabel || "Upcoming Events"}
        </div>
        <div className="space-y-1">
          {upcoming.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">No {t.activeWorkLabel?.toLowerCase() || "upcoming events"}.</div>
          )}
          {upcoming.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick?.(e)}
              className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-muted/40 rounded -mx-1 px-1 transition-colors"
            >
              <span className="text-sm text-foreground flex-1 truncate">{e.title}</span>
              <span className="text-xs text-muted-foreground">{formatEventDate(e.start_date, e.end_date)}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/team")}>
        <Users className="w-4 h-4" />
        {t.teamLabel || "Team"} Availability
      </Button>
    </div>
  );
}