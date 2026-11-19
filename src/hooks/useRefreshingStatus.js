import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRestoredAt, getResumedAt, subscribeResumed } from "@/lib/queryPersistence";

const SHOW_AFTER_MS = 400; // a quick refresh never flashes anything
const MIN_VISIBLE_MS = 700; // once shown, stay long enough to be read
const MAX_VISIBLE_MS = 6000; // never hold the capsule longer than this
const RESULT_MS = 2000; // "Synced" stays this long
const FAILED_MS = 4000; // "Not synced" stays this long
const OFFLINE_CHECK_MS = 2500; // after coming back, wait this long before deciding a refresh could not run

// "idle" | "syncing" | "synced" | "unsynced". Drives the capsule above the search bar:
//  - "syncing" while data that is older than the last visit / last return to the app is being refreshed on screen,
//  - then "synced" for a moment once it is fresh, or "unsynced" if a list could not be refreshed (no internet, error).
// Refreshes of data loaded in this visit never show it. (The longer offline state has its own banner.)
export default function useRefreshingStatus() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    let showTimer = null;
    let hideTimer = null;
    let capTimer = null;
    let resultTimer = null;
    let offlineTimer = null;
    let shownAt = 0;
    let capped = false; // gave up after MAX_VISIBLE_MS: stay hidden until everything has settled

    const since = () => Math.max(getRestoredAt(), getResumedAt());
    const onScreen = (q) => q.getObserversCount() > 0 && q.state.data !== undefined && q.state.dataUpdatedAt < since();
    const staleOnScreen = () => since() > 0 && cache.getAll().some((q) => onScreen(q) && q.state.fetchStatus === "fetching");
    // A list on screen that is still old and either waiting for the internet or failed to refresh.
    const couldNotRefresh = () => since() > 0 && cache.getAll().some((q) => onScreen(q) && (q.state.fetchStatus === "paused" || (q.state.status === "error" && q.state.errorUpdatedAt >= since())));

    const flash = (next, ms) => {
      clearTimeout(resultTimer);
      setPhase(next);
      resultTimer = setTimeout(() => setPhase("idle"), ms);
    };

    const hide = () => {
      clearTimeout(showTimer); showTimer = null;
      clearTimeout(capTimer); capTimer = null;
      if (!shownAt) return;
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        shownAt = 0;
        if (couldNotRefresh()) flash("unsynced", FAILED_MS); else flash("synced", RESULT_MS);
      }, wait);
    };

    const sync = () => {
      if (staleOnScreen()) {
        if (capped) return;
        clearTimeout(hideTimer);
        clearTimeout(resultTimer);
        if (!shownAt && !showTimer) {
          showTimer = setTimeout(() => {
            showTimer = null;
            shownAt = Date.now();
            setPhase("syncing");
            capTimer = setTimeout(() => { capped = true; shownAt = 0; setPhase("idle"); }, MAX_VISIBLE_MS);
          }, SHOW_AFTER_MS);
        }
      } else {
        capped = false;
        hide();
      }
    };

    // Back in the app with no internet: nothing starts fetching, so say it plainly instead of staying silent.
    const unsubResumed = subscribeResumed(() => {
      clearTimeout(offlineTimer);
      offlineTimer = setTimeout(() => { if (!shownAt && !showTimer && couldNotRefresh()) flash("unsynced", FAILED_MS); }, OFFLINE_CHECK_MS);
    });

    const unsub = cache.subscribe(sync);
    sync();
    return () => {
      unsub(); unsubResumed();
      [showTimer, hideTimer, capTimer, resultTimer, offlineTimer].forEach(clearTimeout);
    };
  }, [queryClient]);

  return phase;
}
