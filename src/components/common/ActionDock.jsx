import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const isEditable = (el) =>
  !!el && (el.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|button|submit|range|file|color)$/.test(el.type || "")));

// True while a software keyboard is probably open. Two signals, because browsers disagree:
// the visual viewport shrinking well below the window (iOS Safari, Android with overlay
// keyboard), or a text field having focus on a touch device (Android where the layout resizes).
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    const coarse = window.matchMedia?.("(pointer: coarse)");
    let timer;
    const update = () => {
      const shrunk = vv ? window.innerHeight - vv.height > 120 : false;
      const typing = !!coarse?.matches && isEditable(document.activeElement);
      setOpen(shrunk || typing);
    };
    // Focus moves between fields fire focusout then focusin; wait a tick so the bar doesn't flicker.
    const onFocusChange = () => { clearTimeout(timer); timer = setTimeout(update, 60); };

    vv?.addEventListener("resize", update);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);
    update();
    return () => {
      clearTimeout(timer);
      vv?.removeEventListener("resize", update);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
    };
  }, []);

  return open;
}

// The element that actually scrolls (AppLayout's <main>), falling back to the window.
function scrollParentOf(el) {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
  }
  return window;
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// How far (px) the row has to rise into view for the dock to finish merging into it.
const MERGE_DISTANCE = 150;
// Dock geometry: sits 0.75rem (12px) above the screen edge and is h-14 (56px) tall.
const DOCK_BOTTOM = 12;
const DOCK_HEIGHT = 56;

// Wraps a page's full action row. While that row is still below the fold, a compact
// bar rides the bottom of the screen so the key actions (Save, Cancel, …) are never out of reach.
// As the user scrolls the row into view, the bar glides up into it and dissolves while the row's
// card settles into place — the buttons "merge" into the rest instead of just fading.
//
// Renders a fragment: the zero-height sticky anchor and the row are siblings of the page's
// own container, because `position: sticky` only works while its parent is taller than it.
//
// Props: `onCancel` (round card-style button on the left), `items` (nav-style segments in the
// middle pill: { icon, label, onClick, disabled, tone }), `primary` (the main button on the
// right: { icon, label, onClick, disabled, active, dirty } — `dirty` shows the unsaved dot).
const DOCK_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_-1px_0_rgba(15,23,42,0.04)]";
const TONES = {
  default: "text-muted-foreground hover:text-foreground hover:bg-muted",
  danger: "text-destructive hover:bg-destructive/10",
  success: "text-success hover:bg-success/10",
};

// `mode="top"` is for pages whose real buttons are at the TOP (e.g. the Job Sheet header): the page
// renders <ActionDock mode="top" targetRef={headerRef} …/> at the END of its content (that is where the
// sticky anchor has to live) and passes a ref to the header. The bar then appears once the header
// scrolls out of view and fades away again when it comes back (no gliding — the buttons are at the top).
export default function ActionDock({ onCancel, cancelLabel = "Cancel", cancelIcon: CancelIcon = X, unsavedLabel = "Unsaved changes", items = [], primary, mode = "bottom", targetRef, children }) {
  const top = mode === "top";
  const rowRef = useRef(null);      // measures where the row really is (never transformed)
  const rowInnerRef = useRef(null); // the part that eases into place
  const dockRef = useRef(null);     // scroll-linked: glides + dissolves
  const [merged, setMerged] = useState(true); // true => dock hidden / not interactive
  const getTarget = useCallback(() => (top ? targetRef?.current : rowRef.current), [top, targetRef]);

  // Drive the merge from scroll position. Styles are written straight to the elements (no React
  // state per frame) so it stays smooth, and so the animation follows the finger both ways.
  const update = useCallback(() => {
    const row = getTarget();
    const dock = dockRef.current;
    const inner = rowInnerRef.current;
    if (!row || !dock) return;

    const vh = window.innerHeight;
    const rect = row.getBoundingClientRect();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // 0 = target still out of reach (dock fully shown) … 1 = target reached (dock gone, target settled).
    // Bottom mode: the row is below the fold; once it has scrolled past the top it stays 1.
    // Top mode: the header is above the fold; "reached" means it is back in view under the app's top bar.
    // The merge distance never exceeds the target's own height, so the moment the whole target is on
    // screen (even at the very end of the page, where it can't scroll any further) p is already 1
    // and the dock is gone — it can never be left stuck half-faded on top of it.
    const distance = Math.max(1, Math.min(MERGE_DISTANCE, rect.height));
    let p;
    if (top) {
      const scroller = scrollParentOf(row);
      const topEdge = scroller === window ? 0 : scroller.getBoundingClientRect().top;
      p = rect.top >= vh ? 1 : clamp01((rect.bottom - topEdge) / distance);
    } else {
      p = rect.bottom <= 0 ? 1 : clamp01((vh - rect.top) / distance);
    }
    if (reduce) p = p >= 0.5 ? 1 : 0;
    const e = reduce ? p : smooth(0, 1, p);

    if (top) {
      // Top mode (Job Sheet): the buttons live at the top of the page, so no travelling — the bar stays
      // put at the bottom and simply fades, reaching 0 by the time the header is back in view.
      dock.style.transform = "";
      dock.style.opacity = String(1 - smooth(0, 0.6, p));
    } else {
      // Glide toward the row's centre, shrink slightly and dissolve over the last two thirds.
      const dockCentre = vh - DOCK_BOTTOM - DOCK_HEIGHT / 2;
      const rowCentre = rect.top + rect.height / 2;
      const dy = reduce ? 0 : (rowCentre - dockCentre) * e;
      dock.style.transform = `translate3d(0, ${dy}px, 0) scale(${1 - 0.04 * e})`;
      dock.style.opacity = String(1 - smooth(0.3, 1, p));
    }

    // Bottom mode: the row's card rises and fades in as the dock dissolves into it.
    if (inner) {
      inner.style.opacity = String(reduce ? 1 : 0.15 + 0.85 * smooth(0, 0.8, p));
      inner.style.transform = reduce ? "" : `translate3d(0, ${(1 - e) * 14}px, 0)`;
    }

    setMerged(p >= 0.6);
  }, [getTarget, top]);

  useEffect(() => {
    const row = getTarget();
    if (!row) return;
    const scroller = scrollParentOf(row);
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };

    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // The form grows/shrinks (adding items, validation messages) without any scroll.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(row);
    if (row.parentElement) ro?.observe(row.parentElement);
    update();

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
    };
  }, [update]);

  // On-screen keyboard: hide the floating bar while typing so it never sits on top of the
  // keyboard or the field being edited, and bring it back when the keyboard closes.
  const keyboardOpen = useKeyboardOpen();
  const interactive = !merged && !keyboardOpen;

  // Keep the dock out of the tab order / screen readers while it isn't usable.
  useEffect(() => {
    const dock = dockRef.current;
    if (dock) dock.inert = !interactive;
  }, [interactive]);

  return (
    <>
      {/* Same spot and styling as the mobile bottom nav (which is hidden on editor pages).
          Sticky offsets are measured inside the scroll pane's padding, and AppLayout's <main> has
          pb-24 below lg (room for that nav) — so subtract it (6rem) to sit 0.75rem from the screen edge. */}
      {/* Top mode has no button row at the end of the page for the bar to merge into, so the anchor
          reserves the bar's own height (h-14): at the very end of the page the bar rests UNDER the last
          content instead of drawing on top of it. The negative margin cancels AppLayout's pb-24 (below lg),
          so the bar still lands where it floats (about 12px above the screen edge) with no jump. */}
      <div className={cn(
        "no-print sticky bottom-[calc(var(--nav-bottom)-6rem)] lg:bottom-6 z-30 !mt-0 pointer-events-none",
        // margin = -(main's pb-24 + the page's own bottom padding − the bar's float offset), so at the end of
        // the page the bar's bottom edge is exactly --nav-bottom above the screen edge: the same spot it floats at.
        top ? "h-14 -mb-[calc(6rem+1rem-var(--nav-bottom))] sm:-mb-[calc(6rem+1.5rem-var(--nav-bottom))] lg:mb-0" : "h-0"
      )}>
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 transition-[opacity,transform] duration-200 ease-out",
            keyboardOpen ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
          )}
        >
          <div
            ref={dockRef}
            style={{ willChange: "transform, opacity" }}
            className={cn("flex items-end gap-2 max-w-lg mx-auto origin-bottom", interactive ? "pointer-events-auto" : "pointer-events-none")}
            aria-hidden={!interactive}
          >
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label={cancelLabel}
                title={cancelLabel}
                className={cn("shrink-0 w-14 h-14 rounded-full bg-card border border-border text-foreground flex items-center justify-center active:scale-90 transition-transform", DOCK_SHADOW)}
              >
                <CancelIcon className="w-5 h-5" />
              </button>
            )}

            {items.length > 0 && (
              <div className={cn("flex-1 h-14 flex items-stretch gap-0.5 bg-card border border-border rounded-full p-1 min-w-0", DOCK_SHADOW)}>
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      "flex-1 min-w-0 px-2 rounded-full flex flex-col items-center justify-center gap-[3px] transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                      TONES[item.tone] || TONES.default
                    )}
                  >
                    <item.icon className="w-[19px] h-[19px] shrink-0" />
                    <span className="text-[10px] font-semibold leading-[12px] truncate max-w-full">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            {items.length === 0 && <div className="flex-1" />}

            {primary && (
              <button
                type="button"
                onClick={primary.onClick}
                disabled={primary.disabled}
                aria-label={primary.dirty ? `${primary.label} — ${unsavedLabel}` : primary.label}
                className={cn(
                  "relative shrink-0 h-14 px-5 rounded-full border border-border flex items-center justify-center gap-2 text-sm font-semibold transition-transform active:scale-95 disabled:pointer-events-none",
                  primary.active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                  DOCK_SHADOW
                )}
              >
                <primary.icon className="w-5 h-5 shrink-0" />
                <span>{primary.label}</span>
                {primary.dirty && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-warning border-2 border-card" title={unsavedLabel} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      {!top && (
        <div ref={rowRef}>
          <div ref={rowInnerRef} style={{ willChange: "transform, opacity" }}>{children}</div>
        </div>
      )}
    </>
  );
}
