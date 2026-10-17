import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRestoredAt } from "@/lib/queryPersistence";

const SHOW_AFTER_MS = 400; // a quick refresh never flashes anything
const MIN_VISIBLE_MS = 700; // once shown, stay long enough to be read
const MAX_VISIBLE_MS = 6000; // never hold the capsule longer than this

// True while data that came from the saved copy (the last visit) is being refreshed on screen. It drives the
// "Updating…" capsule above the search bar, so people can see that fresh data is on its way. Refreshes of data
// loaded in this visit, and fetches paused by having no internet, never show it.
export default function useRefreshingStatus() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    let showTimer = null;
    let hideTimer = null;
    let capTimer = null;
    let shownAt = 0;
    let capped = false; // gave up after MAX_VISIBLE_MS: stay hidden until everything has settled

    const staleOnScreen = () => {
      const since = getRestoredAt();
      if (!since) return false;
      return cache.getAll().some((q) => q.getObserversCount() > 0 && q.state.fetchStatus === "fetching" && q.state.data !== undefined && q.state.dataUpdatedAt < since);
    };

    const hide = () => {
      clearTimeout(showTimer); showTimer = null;
      clearTimeout(capTimer); capTimer = null;
      if (!shownAt) return;
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { shownAt = 0; setRefreshing(false); }, wait);
    };

    const sync = () => {
      if (staleOnScreen()) {
        if (capped) return;
        clearTimeout(hideTimer);
        if (!shownAt && !showTimer) {
          showTimer = setTimeout(() => {
            showTimer = null;
            shownAt = Date.now();
            setRefreshing(true);
            capTimer = setTimeout(() => { capped = true; hide(); }, MAX_VISIBLE_MS);
          }, SHOW_AFTER_MS);
        }
      } else {
        capped = false;
        hide();
      }
    };

    const unsub = cache.subscribe(sync);
    sync();
    return () => { unsub(); clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(capTimer); };
  }, [queryClient]);

  return refreshing;
}
