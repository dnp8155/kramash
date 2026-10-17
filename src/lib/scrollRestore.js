// Remembers where the <main> scroll pane was on each page so Back / swipe-back lands exactly where you left,
// like a native app. Positions live in memory only (per tab); a fresh load starts at the top.
const positions = new Map();
const MAX_ENTRIES = 100;
const RESTORE_MS = 1500;
let restoring = false;

export function rememberScroll(key, top) {
  if (!key) return;
  positions.delete(key);
  positions.set(key, top);
  if (positions.size > MAX_ENTRIES) positions.delete(positions.keys().next().value);
}

export function getSavedScroll(key) {
  return positions.get(key);
}

// True while a restore is running, so "stay at top on load" guards don't undo it.
export function isRestoringScroll() {
  return restoring;
}

// Pages load their data after mounting, so the content may not be tall enough yet. Keep nudging to `target`
// each frame until it sticks or the person scrolls themselves. Returns a cleanup.
export function restoreScroll(main, target) {
  let stopped = false;
  let raf = 0;
  const startedAt = performance.now();
  restoring = true;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    restoring = false;
    cancelAnimationFrame(raf);
    events.forEach((e) => document.removeEventListener(e, stop));
  };
  const events = ["touchstart", "wheel", "keydown", "mousedown"];
  events.forEach((e) => document.addEventListener(e, stop, { passive: true }));

  const tick = () => {
    if (stopped) return;
    if (Math.abs(main.scrollTop - target) > 1) main.scrollTo({ top: target, left: 0, behavior: "instant" });
    if (performance.now() - startedAt >= RESTORE_MS) { stop(); return; }
    raf = requestAnimationFrame(tick);
  };
  tick();
  return stop;
}

// A page that has just been opened (new navigation) must start at the very top. Things that scroll *by themselves*
// right after it loads — a focus, a scrollIntoView on a nested element, a layout shift — leave it a few pixels down,
// often animated, which reads as a stutter. For a short window after arriving, tiny scrolls the person did not make
// are undone before the next paint. Anything the person does (touch, wheel, key, click) ends the guard at once, and
// larger jumps are left alone so deliberate scroll-to-section behaviour keeps working.
const NUDGE_MAX_PX = 40;
const ARRIVAL_GUARD_MS = 1500;

export function guardTopOnArrival(main) {
  let touched = false;
  const events = ["touchstart", "wheel", "keydown", "mousedown"];
  const mark = () => { touched = true; };
  const onScroll = () => {
    if (touched || restoring) return;
    if (main.scrollTop > 0 && main.scrollTop <= NUDGE_MAX_PX) main.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };
  const stop = () => {
    clearTimeout(timer);
    main.removeEventListener("scroll", onScroll);
    events.forEach((e) => document.removeEventListener(e, mark));
  };
  events.forEach((e) => document.addEventListener(e, mark, { passive: true }));
  main.addEventListener("scroll", onScroll, { passive: true });
  const timer = setTimeout(stop, ARRIVAL_GUARD_MS);
  return stop;
}
