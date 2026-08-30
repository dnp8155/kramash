import { CheckCircle2, Circle, Clock, Calendar } from "lucide-react";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import DayScheduleCard from "@/components/events/DayScheduleCard";
import StatusBadge from "@/components/common/StatusBadge";
import { formatEventDates } from "@/lib/dates";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

const STAGES = [
  { key: "upcoming", label: "Upcoming", icon: Clock },
  { key: "in-progress", label: "In Progress", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "cancelled", label: "Cancelled", icon: Circle },
];

export default function EventProgressTab({
  event,
  workspaceId,
  members,
  services,
  dayAssignments,
  otherDayAssignments,
  blockDates,
  onChanged
}) {
  const term = useBusinessTerminology();
  const dates = event?.event_dates?.length
    ? event.event_dates
    : event?.start_date
      ? [event.start_date]
      : [];

  const currentStageIndex = STAGES.findIndex((s) => s.key === event?.status);

  return (
    <div className="space-y-4">
      {/* Status timeline */}
      <Card className="p-5">
        <div className="text-sm font-semibold text-foreground mb-4">Progress</div>
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.map((stage, i) => {
            const isDone = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <stage.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`w-6 h-px ${i < currentStageIndex ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">Current Status</div>
          <StatusBadge status={event?.status} />
        </div>
      </Card>

      {/* Day schedule */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Schedule</span>
          <span className="text-xs text-muted-foreground">({dates.length} day{dates.length !== 1 ? "s" : ""})</span>
        </div>
        {dates.length === 0 ? (
          <EmptyState
            title="No schedule days"
            description={`Edit the ${term.workItemSingular.toLowerCase()} to set a date range and select days.`}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {dates.slice().sort().map((d) => (
              <DayScheduleCard
                key={d}
                event={event}
                date={d}
                workspaceId={workspaceId}
                members={members}
                services={services}
                dayAssignments={dayAssignments.filter((a) => a.event_id === event.id)}
                otherDayAssignments={otherDayAssignments}
                blockDates={blockDates}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}