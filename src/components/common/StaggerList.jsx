import { motion } from "framer-motion";
import {
  useReducedMotion,
  staggerItem,
  EASE,
  DURATION,
  STAGGER,
} from "@/lib/motionVariants";

export function StaggerList({ children, className, stagger = STAGGER }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: 0.02 } } }}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={staggerItem}
      transition={{ duration: DURATION, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default StaggerList;