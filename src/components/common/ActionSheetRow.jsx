import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// A single tappable row inside an "action sheet" AppDialog — used wherever
// several quick-add actions are collapsed behind one button (e.g. Financial
// page and the Event Payments tab), so the sheet reads as a clear picker
// instead of a cramped dropdown.
export default function ActionSheetRow({ icon: Icon, iconClassName, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted hover:border-primary/30 transition-colors text-left"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", iconClassName)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
