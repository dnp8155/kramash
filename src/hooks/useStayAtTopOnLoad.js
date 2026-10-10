import { useEffect, useLayoutEffect, useRef } from "react";

// How long after a page finishes loading we refuse scrolls the person didn't make.
const GUARD_MS = 2000;

// When a page swaps its loading skeleton for real content, keep it at the top — unless the
// person has started scrolling themselves. The scroll pane is AppLayout's <main>. Anything that
// scrolls it on its own right after load (a focus, a smooth scrollIntoView, a late layout shift)
// is undone in the same frame via the scroll event itself, before it is ever painted, so it never
// shows as "scrolls, then jumps back".
//
// `resetKey` (optional): when it changes (e.g. a different record id) the page counts as a new
// load, so the "has the person scrolled yet" check starts over.
export function useStayAtTopOnLoad(ready, resetKey) {
  const touched = useRef(false);
  const lastKey = useRef(resetKey);
  if (lastKey.current !== resetKey) { lastKey.current = resetKey; touched.current = false; }

  // Counts only interaction that happens while this page is mounted, not the tap that opened it.
  useEffect(() => {
    const mark = () => { touched.current = true; };
    const events = ["touchstart", "wheel", "keydown", "mousedown"];
    events.forEach((e) => document.addEventListener(e, mark, { passive: true }));
    return () => events.forEach((e) => document.removeEventListener(e, mark));
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    const main = document.querySelector("main");
    if (!main) return;

    const toTop = () => {
      if (!touched.current && main.scrollTop > 0) main.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    toTop();

    // Fires before the next paint, so an unwanted scroll is reverted without ever being visible.
    main.addEventListener("scroll", toTop, { passive: true });
    const timer = setTimeout(() => main.removeEventListener("scroll", toTop), GUARD_MS);
    return () => { clearTimeout(timer); main.removeEventListener("scroll", toTop); };
  }, [ready, resetKey]);
}
