import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Opened with a #section in the address (e.g. /quotation/123#share-link): once the page has its data, scroll that
// section into view and outline it briefly so the eye lands on it. Waits a moment first, because the layout scrolls a
// new page to the top, and retries for a few seconds while the section is still being drawn.
export function useScrollToHash(ready) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return undefined;
    const id = decodeURIComponent(hash.slice(1));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let tries = 0;
    let timer;
    const flash = ["ring-2", "ring-primary/40", "rounded-[15px]"];
    const go = () => {
      const el = document.getElementById(id);
      if (!el) {
        if (++tries < 30) timer = setTimeout(go, 100);
        return;
      }
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      el.classList.add(...flash);
      timer = setTimeout(() => el.classList.remove(...flash), 1600);
    };
    timer = setTimeout(go, 200);
    return () => clearTimeout(timer);
  }, [ready, hash]);
}
