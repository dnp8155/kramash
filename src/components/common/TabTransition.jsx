import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/motionVariants";

// Framer-motion fade, keyed by tab. Enter-only on purpose: it used to be an AnimatePresence "wait" exit-then-enter, and
// if the exit never finished (a page backgrounded mid-switch, a quick double tap, a lazy tab still loading) the new tab
// was never mounted and the page stayed blank. A keyed element with no exit swaps the content at once and cannot get stuck.
export default function TabTransition({ tabKey, children, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={tabKey}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
