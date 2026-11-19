import { CalendarCheck, ArrowUpRight } from "lucide-react";
import { useT } from "@/hooks/useT";

// "Go to event / project" chip for a saved quotation or invoice: shows the job it belongs to and opens it.
// `term` is the business terminology: the wording follows the business (Go to event / project / appointment /
// engagement / campaign) and any custom work label set in Preferences.
export default function GoToEventLink({ event, term, onOpen }) {
  const t = useT();
  if (!event) return null;
  const label = term?.goToWorkItemLabel || "Go to event";
  return (
    <button
      type="button"
      onClick={onOpen}
      title={event.title}
      className="inline-flex items-center gap-2 max-w-full rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
    >
      <CalendarCheck className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-muted-foreground shrink-0">{t(label)}</span>
      <span className="truncate max-w-[10rem] sm:max-w-[16rem]">{event.title}</span>
      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}
