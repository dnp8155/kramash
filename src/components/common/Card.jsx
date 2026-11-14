import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, EASE, DURATION } from "@/lib/motionVariants";

const Card = forwardRef(function Card({ className, hover = false, entrance = false, children, ...props }, ref) {
  const reduce = useReducedMotion();
  const baseClass = cn(
    "bg-card border border-border rounded-[15px] shadow-card",
    hover && "hover:border-primary/40 cursor-pointer transition-colors duration-200",
    className
  );

  if (reduce || !entrance) {
    return (
      <div ref={ref} className={baseClass} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={entrance ? { opacity: 0, y: 8 } : false}
      animate={entrance ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DURATION, ease: EASE }}
      className={baseClass}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export default Card;