import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, EASE, DURATION, DURATION_FAST } from "@/lib/motionVariants";

const Card = forwardRef(function Card({ className, hover = false, entrance = false, children, ...props }, ref) {
  const reduce = useReducedMotion();
  const baseClass = cn(
    "bg-card border border-border rounded-xl shadow-card",
    hover && "hover:shadow-card-hover hover:border-border/80 cursor-pointer transition-shadow duration-200",
    className
  );

  // No motion — plain div (reduced motion or no animation requested)
  if (reduce || (!entrance && !hover)) {
    return (
      <div ref={ref} className={baseClass} {...props}>
        {children}
      </div>
    );
  }

  // Motion card — entrance fade-in-up and/or hover lift
  return (
    <motion.div
      ref={ref}
      initial={entrance ? { opacity: 0, y: 8 } : false}
      animate={entrance ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DURATION, ease: EASE }}
      whileHover={hover ? { y: -2, transition: { duration: DURATION_FAST, ease: EASE } } : undefined}
      className={baseClass}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export default Card;