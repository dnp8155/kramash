import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EASE, useReducedMotion } from "@/lib/motionVariants";
import { cn } from "@/lib/utils";

// Wraps content whose height changes (for example when one view is swapped for another) so the box grows or
// shrinks smoothly instead of snapping. The small padding + matching negative margin keeps focus rings from
// being clipped by the overflow. Reduced motion: no animation.
export default function AnimatedHeight({ children, className }) {
  const reduce = useReducedMotion();
  const innerRef = useRef(null);
  const [height, setHeight] = useState(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={height == null ? undefined : { height: height + 8 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
      className={cn("-m-1 p-1 overflow-hidden", className)}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}
