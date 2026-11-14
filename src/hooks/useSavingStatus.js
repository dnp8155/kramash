import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSavingSnapshot, subscribeSaving } from "@/lib/savingTracker";

const SHOW_AFTER_MS = 300; // quick saves never flash anything
const STARTUP_WINDOW_MS = 12000; // writes that begin this soon after the app opens are start-up work, not the user saving
const APP_OPENED_AT = Date.now();
const MIN_SAVING_MS = 700; // once shown, stay long enough to be read
const SETTLE_DELAY_MS = 150; // a save's screen refresh starts just after the write returns
const SETTLE_MAX_MS = 6000; // never hold the capsule longer than this waiting for the screen to refresh

// "idle" | "starting" | "saving" — drives the capsule that temporarily takes the search bar's place while changes
// are being saved. The result ("saved", errors) is left to the screen's own toast, so nothing shows twice.
//
// The capsule stays until the new card/row is actually on screen: after the last write finishes it keeps
// going until the lists that the save refreshed have finished loading too (capped, so a busy background
// refresh can never trap it).
export default function useSavingStatus() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState("idle");
  const shownAt = useRef(0);

  useEffect(() => {
    let showTimer = null;
    let holdTimer = null;
    let settleTimer = null;
    let unsubCache = null;
    let settleStart = 0;
    let busy = false; // a write is in flight, or its screen refresh is still loading

    const stopSettling = () => {
      clearTimeout(settleTimer); settleTimer = null;
      if (unsubCache) { unsubCache(); unsubCache = null; }
    };

    const finish = () => {
      stopSettling();
      busy = false;
      clearTimeout(showTimer); showTimer = null;
      if (!shownAt.current) return;
      const wait = Math.max(0, MIN_SAVING_MS - (Date.now() - shownAt.current));
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { shownAt.current = 0; setPhase("idle"); }, wait);
    };

    const checkSettled = () => {
      clearTimeout(settleTimer);
      if (getSavingSnapshot().pending > 0) return; // another write started; sync() takes over
      if (queryClient.isFetching() === 0 || Date.now() - settleStart > SETTLE_MAX_MS) { finish(); return; }
      // Still refreshing: look again when the next query finishes (or soon), whichever comes first.
      settleTimer = setTimeout(checkSettled, 250);
    };

    const beginSettling = () => {
      stopSettling();
      settleStart = Date.now();
      unsubCache = queryClient.getQueryCache().subscribe(() => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(checkSettled, 60);
      });
      settleTimer = setTimeout(checkSettled, SETTLE_DELAY_MS);
    };

    const sync = () => {
      const { pending } = getSavingSnapshot();
      if (pending > 0) {
        stopSettling();
        clearTimeout(holdTimer); holdTimer = null;
        busy = true;
        if (shownAt.current || showTimer) return;
        showTimer = setTimeout(() => {
          showTimer = null;
          shownAt.current = Date.now();
          setPhase(Date.now() - APP_OPENED_AT < STARTUP_WINDOW_MS ? "starting" : "saving");
        }, SHOW_AFTER_MS);
        return;
      }
      if (!busy) return; // nothing was saving, so there is nothing to wait for
      beginSettling();
    };

    const unsub = subscribeSaving(sync);
    sync();
    return () => { unsub(); stopSettling(); clearTimeout(showTimer); clearTimeout(holdTimer); };
  }, [queryClient]);

  return phase;
}
