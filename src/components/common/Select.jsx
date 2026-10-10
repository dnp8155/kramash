import { ChevronDown } from "lucide-react";
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
export default function Select({ className, size = "md", icon: Icon, children, ...props }) {
  const { shared, selectOnly } = splitPaddingClasses(className);
  return (
    <div className={cn("relative", shared)}>
      <select
        className={cn(
          "appearance-none bg-card border border-border rounded-lg text-foreground transition-all w-full",
          "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80 cursor-pointer",
          sizes[size],
          shared,
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
}