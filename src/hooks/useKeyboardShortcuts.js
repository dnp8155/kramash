import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { runPageCreateAction } from "@/lib/pageCreateAction";

// A few basic desktop shortcuts. Single keys never fire while typing (inputs, text areas, rich-text editors,
// dropdowns) or with Ctrl / Cmd / Alt held, so they can't clash with typing or the browser's own shortcuts.
//   /      jump to the search box
//   N      add something new on this page (same action as the round + button on phones)
//   Enter  confirm in a confirmation popup (e.g. "Delete this client?")
// Esc already closes popups.
const isTyping = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable || !!el.closest?.('[contenteditable="true"], [role="combobox"], [role="listbox"]');
};
const dialogOpen = () => !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');

// Pages whose "add" opens a full screen (no form on the page itself). The rest register a form via usePageCreateAction.
const NEW_SCREEN = { "/events": "/events/new", "/quotation": "/quotation/new", "/invoices": "/invoices/new" };

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const active = document.activeElement;

      if (e.key === "Enter") {
        // A confirmation popup is open. Popups don't take focus when they open, so focus is usually still on the
        // button that opened it: Enter should confirm the popup, not press that button again. If focus is on one of
        // the popup's own buttons, Enter presses that button as usual (so Cancel stays Cancel).
        const confirmBtn = document.querySelector("[data-confirm-primary]");
        if (!confirmBtn || confirmBtn.disabled) return;
        const dlg = confirmBtn.closest('[role="dialog"], [role="alertdialog"]');
        if (dlg?.contains(active) && (isTyping(active) || active.closest("button, a, [role='button']"))) return;
        e.preventDefault();
        confirmBtn.click();
        return;
      }

      if (isTyping(active) || dialogOpen()) return;

      if (e.key === "/") {
        const input = document.querySelector("input[data-global-search]");
        if (input) { e.preventDefault(); input.focus(); input.select?.(); }
      } else if (e.key === "n" || e.key === "N") {
        if (runPageCreateAction()) e.preventDefault();
        else if (NEW_SCREEN[pathname]) { e.preventDefault(); navigate(NEW_SCREEN[pathname]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, pathname]);
}
