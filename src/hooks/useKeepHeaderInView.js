import { useEffect } from "react";

const isEditable = (el) =>
  !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// On phones the top bar can end up scrolled out of view and stay there: the keyboard or a smooth
// scrollIntoView (sheets, the invoice editor) nudges the page shell or the window, and nothing ever scrolls it
// back. The shell is never meant to scroll (only <main> inside it does), so any offset on it is undone at once,
// and the window offset is undone once the keyboard is gone.
export function useKeepHeaderInView(shellRef) {
  useEffect(() => {
    const shell = shellRef.current;
    let timer;

    const resetShell = () => {
      if (!shell) return;
      if (shell.scrollTop || shell.scrollLeft) shell.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const col = shell.firstElementChild?.nextElementSibling;
      if (col && (col.scrollTop || col.scrollLeft)) col.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    const resetWindow = () => {
      if (isEditable(document.activeElement)) return;
      const vv = window.visualViewport;
      // A pinch-zoomed page is the person's own doing; only fix plain scroll offsets.
      if (vv && vv.scale > 1.01) return;
      if (window.scrollY || window.scrollX) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(() => { resetShell(); resetWindow(); }, 350); };

    shell?.addEventListener("scroll", resetShell, { passive: true });
    shell?.firstElementChild?.nextElementSibling?.addEventListener("scroll", resetShell, { passive: true });
    document.addEventListener("focusout", later);
    window.visualViewport?.addEventListener("resize", later);
    return () => {
      clearTimeout(timer);
      shell?.removeEventListener("scroll", resetShell);
      shell?.firstElementChild?.nextElementSibling?.removeEventListener("scroll", resetShell);
      document.removeEventListener("focusout", later);
      window.visualViewport?.removeEventListener("resize", later);
    };
  }, [shellRef]);
}
