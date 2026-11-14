import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// A section that opens and closes with a smooth height change. It is always built closed first and opened a moment
// later, so the very first open animates just like every later one (building it already open skips the animation).
// The content keeps its full width the whole time, so text never reflows while it moves. Reduced motion: no animation.
export default function Collapse({ open, children, className }) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);

  useEffect(() => {
    if (!open) { setExpanded(false); return undefined; }
    setMounted(true);
    // Two frames: one to paint the closed state, one to start opening it.
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setExpanded(true)); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [open]);

  if (!mounted) return null;
  return (
    <div
      className={cn("grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]", className)}
      aria-hidden={!expanded}
      inert={expanded ? undefined : ""}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
