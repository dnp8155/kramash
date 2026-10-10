import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SPRING_TAB, useReducedMotion } from "@/lib/motionVariants";

// The app's one tab style: a rounded pill track with a springy sliding indicator.
//   items    — strings, or { value, label, icon }
//   layoutId — must be unique per tab group on a page (drives the sliding indicator)
//   stretch  — on phones the tabs share the full width equally
//   scroll   — the track scrolls horizontally when there are many tabs
export default function SegmentedTabs({ items, value, onChange, layoutId, size = "md", stretch: stretchProp = false, scroll = false, className }) {
  // A control with only two tabs stays compact instead of filling the row.
  const stretch = stretchProp && items.length > 2;
  const reduce = useReducedMotion();
  const trackRef = useRef(null);
  const norm = items.map((i) => (typeof i === "string" ? { value: i, label: i } : i));

  // Keep the active tab in view when the track scrolls.
  useEffect(() => {
    if (!scroll) return;
    trackRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value, scroll]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      className={cn(
        "flex items-center gap-1 bg-muted/60 p-1 rounded-full",
        stretch ? "w-full sm:w-auto" : "w-fit max-w-full",
        scroll && "overflow-x-auto scrollbar-thin",
        className
      )}
    >
      {norm.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors shrink-0",
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
              stretch && "flex-1 sm:flex-initial",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-card shadow-sm"
                transition={reduce ? { duration: 0 } : SPRING_TAB}
              />
            )}
            {Icon && <Icon className="w-4 h-4 relative z-10" />}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
