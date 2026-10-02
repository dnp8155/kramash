import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion, EASE, DURATION_FAST } from "@/lib/motionVariants";

const tabVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export default function TabTransition({ tabKey, children, className }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={reduce ? false : "initial"}
        animate="animate"
        exit={reduce ? undefined : "exit"}
        variants={tabVariants}
        transition={{ duration: DURATION_FAST, ease: EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}