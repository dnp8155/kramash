import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { EASE } from "@/lib/motionVariants";

// Smoothly tweens a number from its previous value to a new one whenever it
// changes — an "odometer" style roll instead of an abrupt jump. `format`
// renders the current (possibly fractional, mid-animation) value as text.
export default function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString("en-IN"), duration = 0.6 }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    const controls = animate(prevValue.current, value, {
      duration,
      ease: EASE,
      onUpdate: setDisplay,
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <>{format(display)}</>;
}
