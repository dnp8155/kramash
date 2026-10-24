import { motion } from "framer-motion";
import { useReducedMotion, pageVariants, EASE, DURATION } from "@/lib/motionVariants";

// Wide screens get a slightly longer, roomier slide so route changes feel
// smooth rather than snappy; phones keep the short transition.
const isDesktop = () => typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches;

const desktopVariants = {
  initial: { opacity: 0, y: 14, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.998 },
};

export default function PageTransition({ children, className }) {
  const reduce = useReducedMotion();
  const desktop = isDesktop();
  return (
    <motion.div
      initial={reduce ? false : "initial"}
      animate="animate"
      exit={reduce ? undefined : "exit"}
      variants={desktop ? desktopVariants : pageVariants}
      transition={{ duration: desktop ? 0.3 : DURATION, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
