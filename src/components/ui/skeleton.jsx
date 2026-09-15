import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motionVariants";

function Skeleton({ className, ...props }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={cn("rounded-md bg-primary/10", className)} {...props} />;
  }
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-primary/10", className)} {...props}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
      />
    </div>
  );
}

export { Skeleton }