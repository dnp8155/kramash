import { cn } from "@/lib/utils";
import AnimatedNumber from "@/components/common/AnimatedNumber";

const toneDot = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-accent",
  muted: "bg-muted-foreground"
};

const toneIcon = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-accent",
  muted: "text-muted-foreground"
};

// A numeric `value` counts up on load and tweens on change; `format` turns the
// in-flight number into text (e.g. currency). Non-numeric values render as-is.
export default function StatCard({ label, value, format, icon: Icon, tone = "primary", sub, className }) {
  return (
    <div
      className={cn(
        "relative bg-card border border-border rounded-[15px] p-4 sm:p-5 shadow-card overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", toneDot[tone] || toneDot.primary)} />
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] truncate">
          {label}
        </div>
        {Icon && (
          <Icon
            className={cn("w-3.5 h-3.5 ml-auto shrink-0", toneIcon[tone] || toneIcon.primary)}
            strokeWidth={2}
          />
        )}
      </div>

      <div className="mt-3 text-2xl sm:text-[1.625rem] font-mono font-semibold tabular-nums text-foreground leading-none tracking-tight truncate">
        {typeof value === "number" ? (
          <AnimatedNumber
            value={value}
            from={0}
            // Whole-number targets shouldn't flash decimals mid-count.
            format={format && ((v) => format(Number.isInteger(value) ? Math.round(v) : v))}
          />
        ) : value}
      </div>

      {sub && (
        <div className="mt-2 text-xs text-muted-foreground truncate">
          {sub}
        </div>
      )}
    </div>
  );
}