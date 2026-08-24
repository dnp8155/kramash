import { ArrowRight, Wallet, Users } from "lucide-react";
import { upcomingEvents } from "@/data/mockEvents";
import Button from "@/components/common/Button";

export default function EventsRightPanel() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Time module */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Right Now</div>
        <div className="mt-1 text-sm font-medium text-foreground">{dateStr}</div>
        <div className="text-sm text-muted-foreground">{timeStr}</div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          India
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Upcoming Events
        </div>
        <div className="space-y-1">
          {upcomingEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-1.5">
              <span className="text-sm text-foreground flex-1 truncate">{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.date}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </div>
        <button className="mt-2 text-sm text-primary font-medium hover:underline">Go to Calendar</button>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <Button variant="dark" className="w-full justify-start">
          <Wallet className="w-4 h-4" />
          Record Payment
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <Users className="w-4 h-4" />
          Team Availability
        </Button>
      </div>
    </div>
  );
}