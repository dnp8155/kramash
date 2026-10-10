import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { EASE, useReducedMotion } from "@/lib/motionVariants";

// Smoothly tweens a number from its previous value to a new one whenever it
// changes — an "odometer" style roll instead of an abrupt jump. `format`
// renders the current (possibly fractional, mid-animation) value as text.
// Pass `from` to also count up from that value on first mount.
export default function AnimatedNumber({ value, from, format = (v) => Math.round(v).toLocaleString("en-IN"), duration = 0.6 }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(from ?? value);
  const prevValue = useRef(from ?? value);

  useEffect(() => {
    if (prevValue.current === value) return;
    if (reduce) {
      prevValue.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(prevValue.current, value, {
      duration,
      ease: EASE,
      onUpdate: setDisplay,
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <>{format(display)}</>;
}
