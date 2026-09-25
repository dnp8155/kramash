import { cn } from "@/lib/utils";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";

const styles = {
  upcoming: "bg-badge-upcoming-bg text-badge-upcoming-fg",
  progress: "bg-badge-progress-bg text-badge-progress-fg",
  completed: "bg-badge-completed-bg text-badge-completed-fg",
  postponed: "bg-badge-postponed-bg text-badge-postponed-fg",
  cancelled: "bg-destructive/10 text-destructive"
};

export default function StatusBadge({ status, className, cardView = false }) {
  const { showProgressIndicators } = useDisplayPreferences();
  const cfg = EVENT_STATUS[status];
  if (!cfg) return null;

  if (cardView && !showProgressIndicators) return null;

  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles[cfg.badge],
        className
      )}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {cfg.label}
    </span>
  );
}