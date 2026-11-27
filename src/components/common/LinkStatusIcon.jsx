import { Link2, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// Small tappable icon beside a quotation / invoice status tag: green link = the client link is on, grey broken link
// = off. Tapping opens the document at its link-sharing section.
export default function LinkStatusIcon({ on, onClick, className }) {
  const t = useT();
  const label = on ? t("Link sharing is on") : t("Link sharing is off");
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={label}
      aria-label={label}
      className={cn(
        // Just the icon in its colour (no circle); a little padding keeps it easy to tap.
        "inline-flex items-center justify-center p-1 -m-1 shrink-0 transition-opacity sm:hover:opacity-70",
        on ? "text-success" : "text-muted-foreground",
        className
      )}
    >
      {on ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
    </button>
  );
}
