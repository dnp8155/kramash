import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// Shown on an event/project the owner has marked as settled (no more payment reminders for it).
export default function SettledBadge({ event, className }) {
  const t = useT();
  if (!event?.settled) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-badge-completed-bg text-badge-completed-fg", className)}>
      <CheckCheck className="w-3 h-3 shrink-0" />
      {t("Settled")}
    </span>
  );
}
