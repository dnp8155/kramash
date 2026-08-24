import { cn } from "@/lib/utils";
import { EVENT_STATUS } from "@/constants/statusConfig";

const styles = {
  upcoming: "bg-badge-upcoming-bg text-badge-upcoming-fg",
  progress: "bg-badge-progress-bg text-badge-progress-fg",
  completed: "bg-badge-completed-bg text-badge-completed-fg"
};

export default function StatusBadge({ status, className }) {
  const cfg = EVENT_STATUS[status];
  if (!cfg) return null;
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