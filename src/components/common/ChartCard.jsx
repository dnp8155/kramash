import { cn } from "@/lib/utils";

// The dashboard chart's card: icon + title (+ muted subtitle) on the left, series switches on the right that double
// as the legend, then a fixed-height plot area with a shimmer skeleton while loading.
//   series   — [{ key, label, color }]; shown as legend pills
//   visible  — { [key]: boolean }; with onToggle(key) the pills switch series on/off, without it they are a plain legend
//   action   — the card's "see more" link, at the right end of the header like the other dashboard cards (e.g. "Report →")
//   right    — extra node at the right of the header (e.g. a total) when there is no legend
export default function ChartCard({ icon: Icon, title, subtitle, series, visible, onToggle, action, right, isLoading, heightClass = "h-64", className, children }) {
  return (
    <div className={cn("bg-card border border-border rounded-[15px] shadow-card h-full", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2 order-1">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <span className="text-xs text-muted-foreground">· {subtitle}</span>}
        </div>
        {series?.length > 0 ? (
          <div className="flex items-center gap-1.5 order-3 w-full sm:order-2 sm:w-auto sm:ml-auto" role="group" aria-label={title}>
            {series.map((s) => {
              const on = visible ? visible[s.key] !== false : true;
              const dot = <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: on ? s.color : "transparent", border: `1.5px solid ${s.color}` }} />;
              const pill = cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
                on ? "border-border bg-card text-foreground" : "border-transparent bg-muted text-muted-foreground"
              );
              return onToggle ? (
                <button key={s.key} type="button" onClick={() => onToggle(s.key)} aria-pressed={on} className={pill}>{dot}{s.label}</button>
              ) : (
                <span key={s.key} className={pill}>{dot}{s.label}</span>
              );
            })}
          </div>
        ) : right && <div className="order-2 ml-auto">{right}</div>}
        {action && <div className="order-2 ml-auto sm:order-3 sm:ml-0">{action}</div>}
      </div>

      <div className={cn("px-2 py-4", heightClass)}>
        {isLoading ? <div className="h-full w-full rounded-lg bg-muted/40 skeleton-shimmer" /> : children}
      </div>
    </div>
  );
}
