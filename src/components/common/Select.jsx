import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 text-base md:text-xs pl-2.5 pr-7",
  md: "h-9 text-base md:text-sm pl-3 pr-8"
};

// Horizontal padding utilities (e.g. pl-10 for a custom left icon) are meant for
// the <select>'s own inner text inset — forwarding them to the wrapper div too
// would inset it a second time, doubling the effect. Everything else (width,
// flex, height, text size…) is safe to apply to both.
const PADDING_RE = /^(?:[a-z]+:)*p[lrxy]?-/;
function splitPaddingClasses(className) {
  if (!className) return { shared: "", selectOnly: "" };
  const tokens = className.split(/\s+/).filter(Boolean);
  const selectOnly = tokens.filter((t) => PADDING_RE.test(t));
  const shared = tokens.filter((t) => !PADDING_RE.test(t));
  return { shared: shared.join(" "), selectOnly: selectOnly.join(" ") };
}

// `icon` (a lucide component) is drawn inside the field, above the select, with the text inset to clear it.
export default function Select({ className, size = "md", icon: Icon, onClear, clearLabel = "Clear", children, ...props }) {
  const { shared, selectOnly } = splitPaddingClasses(className);
  const field = (
    <div className={cn("relative", onClear ? "flex-1 min-w-0" : shared)}>
      <select
        className={cn(
          "min-w-0 appearance-none bg-card border border-border rounded-lg text-foreground transition-all w-full",
          "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80 cursor-pointer",
          sizes[size],
          !onClear && shared,
          Icon && "pl-10",
          selectOnly
        )}
        {...props}
      >
        {children}
      </select>
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0" />}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
  if (!onClear) return field;
  // The clear button sits outside the field as its own round bordered button.
  return (
    <div className={cn("flex items-center gap-2", shared)}>
      {field}
      <button type="button" aria-label={clearLabel} onClick={onClear} className="relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}