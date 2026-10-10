import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// The editor provides this so every collapsible Section can start closed (a saved quotation) and
// fold itself away again each time the quotation is saved (collapseKey changes).
export const SectionCollapseContext = createContext({ collapseKey: 0, startCollapsed: false });

// `collapsible` turns the heading into an accordion toggle. The body stays mounted while closed
// (hidden), so editors inside it keep their state.
export function Section({ icon: Icon, title, children, collapsible = false, subtitle, action }) {
  const { collapseKey, startCollapsed } = useContext(SectionCollapseContext);
  const [open, setOpen] = useState(!(collapsible && startCollapsed));
  const lastKey = useRef(collapseKey);
  useEffect(() => {
    if (lastKey.current === collapseKey) return;
    lastKey.current = collapseKey;
    if (collapsible) setOpen(false);
  }, [collapseKey, collapsible]);

  const heading = (
    <>
      {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <span className="text-xs text-muted-foreground font-normal">{subtitle}</span>}
    </>
  );
  const toggle = () => setOpen((o) => !o);
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {collapsible ? (
        <div className={cn("flex items-center gap-2", open && "mb-3")}>
          <button type="button" onClick={toggle} aria-expanded={open} className="flex items-center gap-2 flex-1 min-w-0 text-left flex-wrap">
            {heading}
          </button>
          {open && action}
          <button type="button" onClick={toggle} aria-label={title} aria-expanded={open} className="shrink-0">
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {heading}
          {action && <span className="ml-auto">{action}</span>}
        </div>
      )}
      <div className={cn("space-y-3", !open && "hidden")}>{children}</div>
    </div>
  );
}

// `hint` is a helper line under the input; with `error` it turns red.
export function Field({ label, children, hint, error }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
      {hint && <p className={`text-[11px] mt-1 leading-snug ${error ? "text-destructive" : "text-muted-foreground"}`}>{hint}</p>}
    </div>
  );
}

export function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}