import { CheckCircle2, Circle, Clock, Calendar, IndianRupee, TrendingUp, AlertCircle } from "lucide-react";
import { useMemo } from "react";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import DayScheduleCard from "@/components/events/DayScheduleCard";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import { formatEventDates } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "upcoming", label: "Upcoming", icon: Clock },
  { key: "in-progress", label: "In Progress", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "cancelled", label: "Cancelled", icon: Circle },
];

function ProgressBar({ value, tone = "primary" }) {
  const pct = Math.min(100, Math.max(0, value));
  const toneClasses = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    accent: "bg-accent",
  };
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", toneClasses[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function EventProgressTab({
  event,
  workspaceId,
  members,
  services,
  eventAssignments,
  serviceAssignments,
  dayAssignments,
  otherDayAssignments,
  blockDates,
  onChanged,
  fin,
  currency,
}) {
  const term = useBusinessTerminology();
  const dates = event?.event_dates?.length
    ? event.event_dates
    : event?.start_date
      ? [event.start_date]
      : [];

  const currentStageIndex = STAGES.findIndex((s) => s.key === event?.status);

  // ---- Automated progress calculation ----
  const autoProgress = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // Date-based progress
    const allDates = dates.slice().sort();
    const totalDays = allDates.length || 1;
    const completedDays = allDates.filter((d) => d < todayStr).length;
    const datePct = event?.status === "completed"
      ? 100
      : event?.status === "cancelled"
        ? 0
        : Math.round((completedDays / totalDays) * 100);

    // Payment-based progress
    const contractValue = fin?.contractValue || 0;
    const received = fin?.received || 0;
    const paymentPct = contractValue > 0
      ? Math.min(100, Math.round((received / contractValue) * 100))
      : event?.status === "completed" ? 100 : 0;

    // Overall progress — weighted average (50% dates, 50% payments)
    let overall = 0;
    if (event?.status === "completed") {
      overall = 100;
    } else if (event?.status === "cancelled") {
      overall = 0;
    } else if (event?.status === "in-progress") {
      overall = Math.round((datePct * 0.5) + (paymentPct * 0.5));
    } else {
      // upcoming — mostly payment-based (advance received?)
      overall = paymentPct > 0 ? Math.round(paymentPct * 0.3) : 0;
    }

    // Suggested status
    let suggestedStatus = event?.status;
    let suggestionReason = "";
    if (event?.status !== "cancelled" && event?.status !== "completed") {
      const eventEnd = allDates.length ? allDates[allDates.length - 1] : event?.end_date;
      if (eventEnd && eventEnd < todayStr && completedDays === totalDays) {
        suggestedStatus = "completed";
        suggestionReason = "All event dates have passed — consider marking as completed.";
      } else if (completedDays > 0 && completedDays < totalDays) {
        if (event?.status !== "in-progress") {
          suggestedStatus = "in-progress";
          suggestionReason = "Event is currently underway — status should be In Progress.";
        }
      }
    }

    return {
      datePct,
      paymentPct,
      overall,
      completedDays,
      totalDays,
      suggestedStatus,
      suggestionReason,
    };
  }, [dates, event?.status, event?.end_date, fin?.contractValue, fin?.received]);

  const updateStatus = async (newStatus) => {
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.entities.Event.update(event.id, { status: newStatus });
      onChanged?.();
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Automated progress overview */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">Automated Progress</div>
        </div>

        {/* Overall progress ring */}
        <div className="flex items-center gap-6 mb-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(autoProgress.overall / 100) * 264} 264`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{autoProgress.overall}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Schedule Progress
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {autoProgress.completedDays}/{autoProgress.totalDays} days
                </span>
              </div>
              <ProgressBar value={autoProgress.datePct} tone="accent" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> Payment Progress
                </span>
                <span className="text-xs font-semibold text-foreground">{autoProgress.paymentPct}%</span>
              </div>
              <ProgressBar value={autoProgress.paymentPct} tone="success" />
            </div>
          </div>
        </div>

        {/* Status suggestion */}
        {autoProgress.suggestionReason && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 mb-3">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">{autoProgress.suggestionReason}</p>
              {autoProgress.suggestedStatus !== event?.status && (
                <button
                  onClick={() => updateStatus(autoProgress.suggestedStatus)}
                  className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Update status to "{autoProgress.suggestedStatus}" →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Financial snapshot */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Received</div>
            <div className="text-sm font-bold text-success mt-0.5">{formatMoney(fin?.received || 0, currency)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Contract</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatMoney(fin?.contractValue || 0, currency)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pending</div>
            <div className="text-sm font-bold text-warning mt-0.5">{formatMoney(Math.max(0, fin?.pending || 0), currency)}</div>
          </div>
        </div>
      </Card>

      {/* Status timeline */}
      <Card className="p-5">
        <div className="text-sm font-semibold text-foreground mb-4">Status Timeline</div>
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.map((stage, i) => {
            const isCancelled = event?.status === "cancelled";
            const isDone = !isCancelled && i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  <stage.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={cn("w-6 h-px", i < currentStageIndex ? "bg-success" : "bg-border")} />
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
                eventAssignments={(eventAssignments || []).filter((a) => a.event_id === event.id && a.assignment_status !== "removed")}
                serviceAssignments={(serviceAssignments || []).filter((a) => a.assignment_status !== "removed")}
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