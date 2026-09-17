// EventTypeBadge — renders an event/work type as plain text.
// Automatic color assignment based on type name has been removed;
// the user now manually selects a theme color in Preferences (Pastel theme).
import { cn } from "@/lib/utils";

export default function EventTypeBadge({ eventType, size = "sm", showLabel = true, className }) {
  if (!eventType) return null;
  return showLabel ? <span className={cn("text-inherit", className)}>{eventType}</span> : null;
}