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

export default function StatusBadge({ status, className }) {
  const { showProgressIndicators } = useDisplayPreferences();
  const cfg = EVENT_STATUS[status];
  if (!cfg) return null;

  // When progress indicators are OFF, show plain text label without any color.
  if (!showProgressIndicators) {
    return (
      <span className={cn("text-xs font-medium text-muted-foreground", className)}>
        {cfg.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        styles[cfg.badge],
        className
      )}
    >
      {cfg.label}
    </span>
  );
}