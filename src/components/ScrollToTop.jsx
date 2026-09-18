import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getHashId = (hash) => {
  const rawId = hash.slice(1);
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map());
  const prevPathRef = useRef(pathname);
  const skipSave = useRef(false);

  // Continuously track scroll position of the <main> container (or window
  // for public pages without AppLayout) so we can restore it on back/forward.
  useEffect(() => {
    const main = document.querySelector("main");
    const target = main || window;
    const onScroll = () => {
      if (skipSave.current) return;
      const pos = main ? main.scrollTop : window.scrollY;
      scrollPositions.current.set(prevPathRef.current, pos);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  // Synchronously update ref and set skip flag BEFORE scroll events fire
  // (useLayoutEffect runs after DOM mutations but before paint/scroll events).
  useLayoutEffect(() => {
    skipSave.current = true;
    prevPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const main = document.querySelector("main");
    const enableSaving = () => { skipSave.current = false; };

    // Back/forward navigation — restore saved scroll position
    if (navigationType === "POP") {
      const saved = scrollPositions.current.get(pathname);
      if (saved != null) {
        const timer = setTimeout(() => {
          const m = document.querySelector("main");
          if (m) m.scrollTop = saved;
          else window.scrollTo(0, saved);
          enableSaving();
        }, 300);
        return () => { clearTimeout(timer); enableSaving(); };
      }
    }

    // Hash navigation — scroll to element
    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      const enableTimer = setTimeout(enableSaving, 100);
      return () => { clearTimeout(timer); clearTimeout(enableTimer); enableSaving(); };
    }

    // Forward navigation — scroll to top
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    const enableTimer = setTimeout(enableSaving, 100);
    return () => { clearTimeout(enableTimer); enableSaving(); };
  }, [pathname, hash, navigationType]);

  return null;
}