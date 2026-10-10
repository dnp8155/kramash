import { useSyncExternalStore } from "react";

// What was typed into the header search box on a mobile page that filters its OWN content (the
// More page, the Preferences page) instead of searching events/clients/team. The header owns the
// input and the page owns the list, so they share the text through this tiny store.
let query = "";
const listeners = new Set();

export function setPageSearchQuery(next) {
  if (next === query) return;
  query = next;
  listeners.forEach((l) => l());
}

export function usePageSearchQuery() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => query,
    () => ""
  );
}
