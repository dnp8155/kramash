import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motionVariants";
import { cn } from "@/lib/utils";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
const scramble = (text) => text.replace(/\S/g, randomGlyph);

// Shows ONE word at a time and cycles through them: each new word scramble-reveals (random letters
// resolving left to right) while the others are hidden. The slot's width glides to the new word's
// width, so a centred line smoothly slides sideways instead of jumping. It only runs while on screen.
// Screen readers get every word; reduced-motion users get all of them statically.
export default function ScrambleCycle({ words, scrambleMs = 750, holdMs = 1800, className }) {
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const measureRefs = useRef([]);
  const [widths, setWidths] = useState([]);
  const [idx, setIdx] = useState(0);
  const [display, setDisplay] = useState(() => scramble(words[0]));
  const [visible, setVisible] = useState(false);

  // Measure each word at its real size, so the slot can animate to the exact width of the next one.
  useLayoutEffect(() => {
    const measure = () => setWidths(measureRefs.current.map((el) => el?.offsetWidth || 0));
    measure();
    document.fonts?.ready?.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [words]);

  // Only animate while it is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduce || typeof IntersectionObserver === "undefined") { setVisible(!reduce); return; }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  useEffect(() => {
    if (!visible || reduce) return;
    let frame = 0;
    let timer;

    const reveal = (i) => {
      const target = words[i];
      setIdx(i); // the slot starts gliding to this word's width right away
      const t0 = performance.now();
      let lastShuffle = 0;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / scrambleMs);
        if (p >= 1) {
          setDisplay(target);
          timer = setTimeout(() => reveal((i + 1) % words.length), holdMs);
          return;
        }
        // Flicker the unresolved letters ~every 45ms, not every frame, so it reads as a scramble.
        if (now - lastShuffle > 45) {
          lastShuffle = now;
          const done = Math.floor(p * target.length);
          setDisplay(target.split("").map((ch, k) => (ch === " " || k < done ? ch : randomGlyph())).join(""));
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    // Carry on from whichever word is current (first start, or after scrolling back into view).
    reveal(idx);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
    // idx is intentionally read only at (re)start — the loop advances it itself.
  }, [visible, reduce, words, scrambleMs, holdMs]);

  if (reduce) {
    return <span className={className}>{words.join(" · ")}</span>;
  }

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-block whitespace-nowrap text-left", className)}
      style={{ width: widths[idx] || undefined, transition: "width 500ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{words.join(", ")}</span>
      {/* Hidden copies at the real font size, only used to measure each word's width. */}
      <span aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap">
        {words.map((w, i) => (
          <span key={w} ref={(el) => { measureRefs.current[i] = el; }} className="absolute left-0 top-0">{w}</span>
        ))}
      </span>
    </span>
  );
}
