// EventTypeBadge — renders an event/work type with a pastel dot when the Pastel theme is
// active, or plain text otherwise. Label color inherits from the parent so existing
// muted/foreground styling is preserved (no contrast break). The dot uses the
// `.event-type-dot` class so it can be targeted by CSS if needed.
import { usePastelTheme } from "@/hooks/usePastelTheme";
import { cn } from "@/lib/utils";

export default function EventTypeBadge({ eventType, size = "sm", showLabel = true, className }) {
  const { isActive, getColorForType } = usePastelTheme();
  if (!eventType) return null;

  if (!isActive) {
    return showLabel ? <span className={cn("text-inherit", className)}>{eventType}</span> : null;
  }

  const color = getColorForType(eventType);
  const dotSize = size === "lg" ? "w-3 h-3" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <span className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      <span
        className={cn("event-type-dot inline-block rounded-full shrink-0", dotSize)}
        style={{ backgroundColor: color }}
      />
      {showLabel && <span className="text-inherit truncate">{eventType}</span>}
    </span>
  );
}