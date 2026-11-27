import { useCallback, useEffect, useRef, useState } from "react";
import { portalSignature } from "@/lib/portalSignature";

const CHECK_EVERY_MS = 60000; // once a minute while the page is on screen
const MIN_GAP_MS = 10000; // and when the person comes back to it, but never more than every 10 s

// Quietly checks a portal for changes made by the business. Nothing reloads on its own: when the latest details
// differ from what's on screen, `hasUpdate` turns on (the floating "New update" button appears) and `apply()` puts
// them on screen. `fetchLatest` must load the page's details WITHOUT counting a view.
export function usePortalUpdates({ enabled, current, fetchLatest, onApply }) {
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const baseline = useRef("");
  const lastCheck = useRef(0);
  const inFlight = useRef(false);
  const fetchRef = useRef(fetchLatest);
  fetchRef.current = fetchLatest;

  // What's on screen now is the baseline; anything already waiting is dropped once the screen matches it.
  useEffect(() => {
    baseline.current = portalSignature(current);
    setPending((p) => (p && portalSignature(p) === baseline.current ? null : p));
  }, [current]);

  const check = useCallback(async (force = false) => {
    if (!enabled || inFlight.current || document.visibilityState !== "visible") return;
    if (!force && Date.now() - lastCheck.current < MIN_GAP_MS) return;
    inFlight.current = true;
    lastCheck.current = Date.now();
    try {
      const latest = await fetchRef.current();
      if (latest != null && portalSignature(latest) !== baseline.current) setPending(latest);
    } catch { /* offline or a hiccup: try again at the next check */ }
    finally { inFlight.current = false; }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => check(true), CHECK_EVERY_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [enabled, check]);

  // Load once more on tap (so it's the very latest), fall back to what the check found, then show it.
  const apply = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    try {
      let latest = null;
      try { latest = await fetchRef.current(); } catch { /* use what the check already loaded */ }
      const next = latest ?? pending;
      if (next != null) {
        onApply(next);
        baseline.current = portalSignature(next);
      }
      setPending(null);
      return next != null;
    } finally {
      setBusy(false);
    }
  }, [busy, pending, onApply]);

  return { hasUpdate: !!pending, busy, apply };
}
