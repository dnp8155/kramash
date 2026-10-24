// Keeps a copy of the app's loaded lists on the device (IndexedDB), so reopening the app shows the last-known
// data straight away while fresh data is fetched quietly in the background (the capsule above the search bar says
// "Syncing…" meanwhile). Also what the app shows when there is no internet.
//
// - One copy per user; it is deleted on sign-out and thrown away after an app update or after 24 hours.
// - Only an allow-list of everyday lists is kept (never admin, security or plan data).
// - Any storage problem (private window, full disk, no IndexedDB) just means the app loads as it did before.
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del, keys } from "idb-keyval";
import { APP_CONFIG } from "@/lib/appConfig";

const PREFIX = "kramasha-query-cache:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RESTORE_TIMEOUT_MS = 1500; // a slow disk must never hold the app back

// The first part of each query key worth keeping.
const PERSIST_KEYS = new Set([
  "dashboard", "dashboard-transactions", "events", "event", "clients", "client", "leads", "lead-activities",
  "quotations", "invoices", "team", "team-member", "financial", "financial-years", "fy-month-lock",
  "notifications", "storage-drives", "storage-locations", "storage-lookups",
]);

let disabled = false; // set while signing out, so a late write can't bring the copy back
let restoredAt = 0; // when a saved copy was loaded; data older than this came from the saved copy
export const getRestoredAt = () => restoredAt;

const storage = {
  getItem: (k) => get(k),
  setItem: (k, v) => (disabled ? undefined : set(k, v)),
  removeItem: (k) => del(k),
};

const persisterFor = (userId) => createAsyncStoragePersister({ storage, key: `${PREFIX}${userId}`, throttleTime: 2000 });
const buster = () => APP_CONFIG.version;

// Loads the saved copy (if any) into the query cache. Never throws, never waits longer than RESTORE_TIMEOUT_MS.
export async function restoreQueryCache(queryClient, userId) {
  disabled = false;
  if (typeof indexedDB === "undefined" || !userId) return;
  try {
    await Promise.race([
      persistQueryClientRestore({ queryClient, persister: persisterFor(userId), maxAge: MAX_AGE_MS, buster: buster() }),
      new Promise((resolve) => setTimeout(resolve, RESTORE_TIMEOUT_MS)),
    ]);
    restoredAt = Date.now();
  } catch { /* no saved copy: the app loads normally */ }
}

// Saves the cache whenever it changes (throttled). Returns a function that stops saving.
export function startQueryCacheSaving(queryClient, userId) {
  if (typeof indexedDB === "undefined" || !userId) return () => {};
  try {
    return persistQueryClientSubscribe({
      queryClient,
      persister: persisterFor(userId),
      buster: buster(),
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => q.state.status === "success" && PERSIST_KEYS.has(q.queryKey?.[0]),
      },
    });
  } catch { return () => {}; }
}

// Sign-out: delete every saved copy and stop new ones being written.
export async function clearQueryCache() {
  disabled = true;
  restoredAt = 0;
  try {
    const all = await keys();
    await Promise.all(all.filter((k) => String(k).startsWith(PREFIX)).map((k) => del(k)));
  } catch { /* nothing to clear */ }
}

// The app was brought back after a while away and asked every list to refresh (see WorkspaceContext). Lists whose
// data is older than this moment count as "syncing" in the capsule above the search bar, like data from a saved copy.
let resumedAt = 0;
const resumeListeners = new Set();
export const getResumedAt = () => resumedAt;
export const markResumed = () => { resumedAt = Date.now(); resumeListeners.forEach((l) => l()); };
export const subscribeResumed = (l) => { resumeListeners.add(l); return () => resumeListeners.delete(l); };
