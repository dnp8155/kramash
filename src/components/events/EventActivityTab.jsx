import { currencyIcon } from "@/utils/currencyIcon";
import { CheckCircle2, Circle, Clock, Activity, Calendar, TrendingUp, AlertCircle, RotateCcw, Route } from "lucide-react";
import { useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Card from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import SettledBadge from "@/components/common/SettledBadge";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { eventDayList } from "@/lib/dates";
import { askConfirm } from "@/lib/confirmDialog";
import EventStorageSummary from "@/components/events/EventStorageSummary";
import EventMessagesCard from "@/components/messaging/EventMessagesCard";

const STAGES = [
  { key: "upcoming", label: "Upcoming", icon: Clock },
  { key: "in-progress", label: "In Progress", icon: Activity },
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

// Activity: where the job stands (stage, automatic progress, settled), the messages sent to the client, and the storage
// line. The day-by-day plan (title, status, notes, venue) lives on the Team and Services tabs under By date.
export default function EventActivityTab({
  event,
  workspaceId,
  dayAssignments,
  onChanged,
  fin,
  currency,
  hasDues,
  onToggleSettled,
  onOpenStorage,
}) {
  const t = useT();
  const CurrencyIcon = currencyIcon(currency);
  const queryClient = useQueryClient();
  const dates = eventDayList(event);

  const currentStageIndex = STAGES.findIndex((s) => s.key === event?.status);

  const autoProgress = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Local date, not UTC, so the day changes at local midnight (UTC shifts it by hours in India).
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const allDates = dates.slice().sort();
    const totalDays = allDates.length || 1;
    const doneDates = new Set((dayAssignments || []).filter((a) => a.event_id === event?.id && a.status === "done").map((a) => a.date));
    const completedDays = allDates.filter((d) => d < todayStr || doneDates.has(d)).length;
    const datePct = event?.status === "completed"
      ? 100
      : event?.status === "cancelled"
        ? 0
        : Math.round((completedDays / totalDays) * 100);

    const contractValue = fin?.contractValue || 0;
    const received = fin?.received || 0;
    const paymentPct = contractValue > 0
      ? Math.min(100, Math.round((received / contractValue) * 100))
      : event?.status === "completed" ? 100 : 0;

    let overall = 0;
    if (event?.status === "completed") {
      overall = 100;
    } else if (event?.status === "cancelled") {
      overall = 0;
    } else if (event?.status === "in-progress") {
      overall = Math.round((datePct * 0.5) + (paymentPct * 0.5));
    } else {
      overall = paymentPct > 0 ? Math.round(paymentPct * 0.3) : 0;
    }

    let suggestedStatus = event?.status;
    let suggestionReason = "";
    let allDatesPassed = false;
    if (event?.status !== "cancelled" && event?.status !== "completed") {
      const eventEnd = allDates.length ? allDates[allDates.length - 1] : event?.end_date;
      if (eventEnd && eventEnd < todayStr && completedDays === totalDays) {
        suggestedStatus = "completed";
        allDatesPassed = true;
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
      allDatesPassed,
    };
  }, [dates, dayAssignments, event?.id, event?.status, event?.end_date, fin?.contractValue, fin?.received]);

  const updateStatus = async (newStatus) => {
    try {
      const { base44 } = await import("@/api/base44Client");
      queryClient.setQueryData(["events", workspaceId], (oldData) => {
        if (!oldData) return oldData;
        const events = oldData.events || [];
        const idx = events.findIndex((e) => e.id === event.id);
        if (idx >= 0) {
          const updated = [...events];
          updated[idx] = { ...events[idx], status: newStatus };
          return { ...oldData, events: updated };
        }
        return oldData;
      });
      await base44.entities.Event.update(event.id, { status: newStatus });
      onChanged?.();
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  // Everything is done (all dates passed, nothing owed) or the owner settled it: complete automatically.
  // Runs once per event so a status the owner picks by hand afterwards isn't overridden in this session.
  const autoDone = useRef(null);
  useEffect(() => {
    if (!event?.id || autoDone.current === event.id) return;
    if (event.status !== "upcoming" && event.status !== "in-progress") return;
    if (autoProgress.allDatesPassed && (event.settled || hasDues === false)) {
      autoDone.current = event.id;
      updateStatus("completed");
    }
  }, [event?.id, event?.status, event?.settled, hasDues, autoProgress.allDatesPassed]);

  const pickStatus = async (key) => {
    if (key === event?.status) return;
    if (key === "completed" && (!autoProgress.allDatesPassed || (hasDues && !event?.settled))) {
      const why = !autoProgress.allDatesPassed ? t("Some event dates are still ahead.") : t("Payments are still pending.");
      if (!await askConfirm(`${why} ${t("Mark as completed anyway?")} ${t("Payments on a completed job are locked, and can only be voided.")}`)) return;
    }
    if (key === "cancelled" && !await askConfirm(t("Cancel this event?"))) return;
    updateStatus(key);
  };

  return (
    <div className="space-y-4">
      {onOpenStorage && <EventStorageSummary eventId={event.id} onOpen={onOpenStorage} />}
      <EventMessagesCard workspaceId={workspaceId} eventId={event.id} />
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-foreground" />
          <div className="text-sm font-semibold text-foreground">{t("Automated Progress")}</div>
        </div>

        <div className="flex items-center gap-6 mb-5">
          {/* Two rings, matching the bars beside them: outer = schedule (blue), inner = payments (green). */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {[
                { r: 44, value: autoProgress.datePct, color: "hsl(var(--primary-strong, var(--primary)))" },
                { r: 31, value: autoProgress.paymentPct, color: "hsl(var(--success))" },
              ].map((ring) => (
                <g key={ring.r}>
                  <circle cx="50" cy="50" r={ring.r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r={ring.r} fill="none" pathLength="100"
                    stroke={ring.color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${Math.min(100, Math.max(0, ring.value))} 100`}
                    className={ring.value > 0 ? "transition-all duration-500" : "opacity-0"}
                  />
                </g>
              ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{autoProgress.overall}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-foreground" /> {t("Schedule Progress")}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {autoProgress.completedDays}/{autoProgress.totalDays} {t("days")}
                </span>
              </div>
              <ProgressBar value={autoProgress.datePct} tone="primary" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CurrencyIcon className="w-3.5 h-3.5 text-foreground" /> {t("Payment Progress")}
                </span>
                <span className="text-xs font-semibold text-foreground">{autoProgress.paymentPct}%</span>
              </div>
              <ProgressBar value={autoProgress.paymentPct} tone="success" />
            </div>
          </div>
        </div>

        {autoProgress.suggestionReason && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20 mb-3">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">{t(autoProgress.suggestionReason)}</p>
              {autoProgress.suggestedStatus !== event?.status && (
                <button
                  onClick={() => updateStatus(autoProgress.suggestedStatus)}
                  className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {t("Update status to")} "{t(STAGES.find((s) => s.key === autoProgress.suggestedStatus)?.label || autoProgress.suggestedStatus)}" →
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t("Received")}</div>
            <div className="text-sm font-bold text-success mt-0.5">{formatMoney(fin?.received || 0, currency)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t("Contract")}</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatMoney(fin?.contractValue || 0, currency)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t("Pending")}</div>
            <div className="text-sm font-bold text-warning mt-0.5">{formatMoney(Math.max(0, fin?.pending || 0), currency)}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-4 h-4 text-foreground" />
          <div className="text-sm font-semibold text-foreground">{t("Status Timeline")}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.map((stage, i) => {
            const isCancelled = event?.status === "cancelled";
            const isDone = !isCancelled && i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pickStatus(stage.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer hover:opacity-80",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  <stage.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{t(stage.label)}</span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className={cn("w-6 h-px", i < currentStageIndex ? "bg-success" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">{t("Current Status")}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={event?.status} />
            <SettledBadge event={event} />
            {event?.settled && onToggleSettled && (
              <button
                type="button"
                onClick={onToggleSettled}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> {t("Reopen")}
              </button>
            )}
          </div>
        </div>
      </Card>

    </div>
  );
}