import { motion } from "framer-motion";
import { useT } from "@/hooks/useT";
import { useReducedMotion, EASE, DURATION } from "@/lib/motionVariants";

export default function LoadingState({ label = "Loading…" }) {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center justify-center py-16">
      <motion.div
        className="flex items-center gap-3 text-muted-foreground"
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION, ease: EASE }}
      >
        <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
        <span className="text-sm">{t(label)}</span>
      </motion.div>
    </div>
  );
}