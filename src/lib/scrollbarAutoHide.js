// Desktop only: scrollbars stay invisible until you scroll, or move the pointer to the
// edge where the scrollbar sits. The CSS for this lives at the end of index.css and keys
// off two attributes this file sets on the scrolling element:
//   data-scrolling       — set while it is being scrolled (and briefly after)
//   data-scrollbar-hot   — set while the pointer is over its scrollbar edge
// Touch devices are skipped entirely (their scrollbars are already overlays).
const HIDE_AFTER_MS = 900;
const EDGE_PX = 16;

export function initScrollbarAutoHide() {
  if (typeof window === "undefined" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const timers = new WeakMap();
  document.addEventListener(
    "scroll",
    (e) => {
      const el = e.target === document ? document.documentElement : e.target;
      if (!(el instanceof HTMLElement)) return;
      el.setAttribute("data-scrolling", "");
      clearTimeout(timers.get(el));
      timers.set(el, setTimeout(() => el.removeAttribute("data-scrolling"), HIDE_AFTER_MS));
    },
    { capture: true, passive: true }
  );

  const scrollableAncestor = (node) => {
    for (let i = 0; node && node !== document.body && i < 10; i++, node = node.parentElement) {
      if (!(node instanceof HTMLElement)) continue;
      const cs = getComputedStyle(node);
      const y = /(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight;
      const x = /(auto|scroll)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth;
      if (y || x) return { node, y, x };
    }
    return null;
  };

  let hot = null;
  let raf = 0;
  document.addEventListener(
    "pointermove",
    (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const found = scrollableAncestor(e.target);
        let next = null;
        if (found) {
          const r = found.node.getBoundingClientRect();
          const nearRight = found.y && e.clientX >= r.right - EDGE_PX;
          const nearBottom = found.x && e.clientY >= r.bottom - EDGE_PX;
          if (nearRight || nearBottom) next = found.node;
        }
        if (next !== hot) {
          hot?.removeAttribute("data-scrollbar-hot");
          next?.setAttribute("data-scrollbar-hot", "");
          hot = next;
        }
      });
    },
    { passive: true }
  );
}
