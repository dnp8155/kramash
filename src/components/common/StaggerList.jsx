import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  useReducedMotion,
  staggerItem,
  EASE,
  DURATION,
} from "@/lib/motionVariants";

// A row of items that fade up together, but only the FIRST time it shows in a session. Coming back to the page
// (or returning from an event) shows the items straight away, like a native app, because nothing new has appeared.
// `stagger` is the gap between items in seconds; 0 (the default) means they all come in at once.
const PLAYED = new Set();

export function StaggerList({ children, className, id = "stagger", stagger = 0 }) {
  const reduce = useReducedMotion();
  // Decided once, when the list first mounts: a later re-render must not start or stop the animation.
  const animate = useRef(null);
  if (animate.current === null) animate.current = !PLAYED.has(id);
  // Marked as played after it has really appeared (not during render, which React may run twice in development).
  useEffect(() => { PLAYED.add(id); }, [id]);

  if (reduce || !animate.current) return <div className={className}>{children}</div>;
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

// Without a surrounding animating StaggerList (already played, or reduced motion) this is just a plain box.
export function StaggerItem({ children, className, ...props }) {
  return (
    <motion.div variants={staggerItem} transition={{ duration: DURATION, ease: EASE }} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export default StaggerList;
