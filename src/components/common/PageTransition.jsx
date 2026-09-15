import { motion } from "framer-motion";
import { useReducedMotion, pageVariants, EASE, DURATION } from "@/lib/motionVariants";

export default function PageTransition({ children, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "initial"}
      animate="animate"
      exit={reduce ? undefined : "exit"}
      variants={pageVariants}
      transition={{ duration: DURATION, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}