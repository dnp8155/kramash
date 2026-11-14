import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { rememberScroll, getSavedScroll, restoreScroll } from "@/lib/scrollRestore";

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

// restoreScroll expects a scroll pane with scrollTop / scrollTo; on the public pages that pane is the window.
const windowPane = {
  get scrollTop() { return window.scrollY; },
  scrollTo: (opts) => window.scrollTo(opts),
};

export default function ScrollToTop() {
  const location = useLocation();
  const { pathname, hash } = location;
  const navigationType = useNavigationType();
  const prevKeyRef = useRef(location.key);

  // Save the outgoing page's scroll position while the DOM still holds it. The "w:" prefix keeps these apart from
  // the in-app pages, which AppLayout saves per <main> pane under the plain key.
  if (prevKeyRef.current !== location.key) {
    rememberScroll(`w:${prevKeyRef.current}`, window.scrollY);
    prevKeyRef.current = location.key;
  }

  useEffect(() => {
    // Back / forward on a public page (landing, pricing, FAQ, terms...): return to where it was left, like a native app.
    if (navigationType === "POP") {
      if (hash) return undefined;
      const target = getSavedScroll(`w:${location.key}`) ?? 0;
      // Nothing to restore for pages that were left at the top (this also covers the in-app pages, which scroll inside <main>).
      return target > 0 ? restoreScroll(windowPane, target) : undefined;
    }

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return undefined;
  }, [pathname, hash, navigationType]);

  return null;
}
