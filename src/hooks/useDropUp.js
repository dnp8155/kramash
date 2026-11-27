import { useEffect, useState } from "react";

// For a suggestion list under an input: true when there isn't room below (bottom of a dialog's scroll area,
// a clipping box, or above the phone keyboard) but there is more room above, so the list opens upward.
const LIST_HEIGHT = 220;

function clipBounds(el) {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  let top = vv ? vv.offsetTop : 0;
  let bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  for (let p = el?.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p);
    if (/(auto|scroll|hidden|clip)/.test(o.overflowY)) {
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
  }
  return { top, bottom };
}

export function useDropUp(wrapperRef, open) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const { top, bottom } = clipBounds(el);
      const below = bottom - r.bottom;
      const above = r.top - top;
      setUp(below < LIST_HEIGHT && above > below);
    };
    measure();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    return () => {
      vv?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open, wrapperRef]);
  return up;
}
