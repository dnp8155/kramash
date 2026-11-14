import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { SPRING_TAB, useReducedMotion } from "@/lib/motionVariants";

// The app's one tab style: a rounded pill track with a springy sliding indicator.
//   items    — strings, or { value, label, icon }; leave label out for an icon-only tab (then pass title, used as its tooltip and screen-reader name)
//   layoutId — names the sliding indicator (kept per call site; each tab group is also scoped on its own, see below)
//   size     — "sm", "md" (default, the standard size) or "fluid" (compact like sm, standard like md from the lg breakpoint up)
//   stretch  — on phones the tabs share the full width equally
//   scroll   — the track scrolls horizontally when there are many tabs
//   cssIndicator — slide the pill with a plain CSS transition instead of framer-motion's layout animation. For tabs inside an
//                  embedded frame: the frame is resized the moment the content changes height, and a window resize cancels
//                  framer-motion's layout animation, so the pill would just jump.
//
// Smoothness (framer-motion): every tab group sits in its own LayoutGroup, so its pill can only ever slide inside this
// track (never fly in from the same tab group on the page you just left). A scrolling track is marked `layoutScroll`,
// and so is the app's scroll pane (<main> in AppLayout), so the pill is measured correctly while the page or the track
// is scrolling during a switch (it used to slide from the wrong place and snap).
export default function SegmentedTabs({ items, value, onChange, layoutId, size = "md", stretch: stretchProp = false, scroll = false, cssIndicator = false, className }) {
  // A control with only two tabs stays compact instead of filling the row.
  const stretch = stretchProp && items.length > 2;
  const reduce = useReducedMotion();
  const trackRef = useRef(null);
  const groupId = useId();
  const pillId = layoutId || "segmented-tab-pill";
  const norm = items.map((i) => (typeof i === "string" ? { value: i, label: i } : i));

  // CSS-driven pill (see cssIndicator): measured from the active tab, moved with a transition.
  const [pill, setPill] = useState(null);
  const [pillReady, setPillReady] = useState(false);
  useLayoutEffect(() => {
    if (!cssIndicator) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => {
      const el = track.querySelector('[aria-selected="true"]');
      if (el) setPill((p) => (p && p.left === el.offsetLeft && p.width === el.offsetWidth ? p : { left: el.offsetLeft, width: el.offsetWidth }));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(track);
    // Switch the transition on only after the first position is painted, so the pill doesn't slide in on load.
    const raf = requestAnimationFrame(() => setPillReady(true));
    return () => { ro?.disconnect(); cancelAnimationFrame(raf); };
  }, [cssIndicator, value, items.length]);

  // Keep the active tab in view when the track scrolls. Scrolls only this track, sideways — scrollIntoView would also
  // move the page behind it (a few pixels down on arrival), and animating on first render looked like a stutter.
  const mounted = useRef(false);
  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (!scroll) return;
    const track = trackRef.current;
    const el = track?.querySelector('[aria-selected="true"]');
    if (!track || !el || track.scrollWidth <= track.clientWidth) return;
    const tr = track.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const left = track.scrollLeft + (er.left - tr.left) - (tr.width - er.width) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: first ? "instant" : "smooth" });
  }, [value, scroll]);

  // Tracks which edges still have tabs hidden past them, so a cut-off tab doesn't read as the last tab.
  const [more, setMore] = useState({ left: false, right: false });
  // Layout effect so the first paint already has the right end caps (no one-frame flash of rounded ends).
  useLayoutEffect(() => {
    if (!scroll) return;
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const left = track.scrollLeft > 2;
      const right = track.scrollLeft + track.clientWidth < track.scrollWidth - 2;
      setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(track);
    return () => { track.removeEventListener("scroll", update); ro?.disconnect(); };
  }, [scroll, items.length]);

  // Rounded cap ")" only where the tabs really end; a flat cut "]" where more tabs continue.
  // 24px is at least half the track height, so it still looks fully round — but it can animate to flat.
  const CAP = "24px";
  const capStyle = scroll
    ? {
        borderTopLeftRadius: more.left ? 0 : CAP, borderBottomLeftRadius: more.left ? 0 : CAP,
        borderTopRightRadius: more.right ? 0 : CAP, borderBottomRightRadius: more.right ? 0 : CAP,
      }
    : undefined;

  return (
    <LayoutGroup id={groupId}>
      <motion.div
        ref={trackRef}
        role="tablist"
        layoutScroll={scroll || undefined}
        style={capStyle}
        className={cn(
          "flex items-center gap-1 bg-foreground/[0.05] dark:bg-black/30 p-1 rounded-full transition-[border-radius] duration-200",
          cssIndicator && "relative",
          stretch ? "w-full sm:w-auto" : "w-fit max-w-full",
          // The scrollbar is hidden: it added an empty strip under the tabs (making the track taller than the pills), and the
          // flat end caps already show when more tabs continue. overscroll-x-contain keeps a sideways swipe on the tabs
          // from moving the page or going back.
          scroll && "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {cssIndicator && pill && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 bottom-1 left-0 rounded-full bg-card shadow-sm dark:bg-foreground/[0.16] dark:ring-1 dark:ring-foreground/10 dark:shadow-none",
              pillReady && !reduce && "transition-[transform,width] duration-300 [transition-timing-function:cubic-bezier(0.34,1.35,0.64,1)]"
            )}
            style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
          />
        )}
        {norm.map((item) => {
          const active = item.value === value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={item.label ? undefined : item.title}
              title={item.title}
              onClick={() => onChange(item.value)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap shrink-0",
                size === "sm" ? "px-3 py-1 text-xs" : size === "fluid" ? "px-3 py-1 text-xs lg:px-4 lg:py-1.5 lg:text-sm" : "px-4 py-1.5 text-sm",
                stretch && "flex-1 sm:flex-initial",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && !cssIndicator && (
                <motion.span
                  layoutId={pillId}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-foreground/[0.16] dark:ring-1 dark:ring-foreground/10 dark:shadow-none"
                  transition={reduce ? { duration: 0 } : SPRING_TAB}
                />
              )}
              {Icon && <Icon className="w-4 h-4 relative z-10" />}
              {item.label && <span className="relative z-10">{item.label}</span>}
            </button>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
