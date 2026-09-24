import { cn } from "@/lib/utils";

export default function EventTypeBadge({ eventType, size = "sm", showLabel = true, className }) {
  if (!eventType) return null;
  return showLabel ? <span className={cn("text-inherit", className)}>{eventType}</span> : null;
}