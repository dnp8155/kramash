// Tracks backend work that is in flight (saves, deletes, edge-function calls) so the app can show
// "Saving… → Saved" feedback and warn before the tab is closed mid-save. Writers call `trackSaving`
// around the request; the UI reads it through `useSavingStatus`.
let pending = 0;
let failures = 0; // failed requests since the last time everything was idle
let slots = 0; // mounted places (the top bar) that show the status themselves
const listeners = new Set();

const notify = () => listeners.forEach((l) => l());

export function trackSaving(promiseFactory) {
  if (pending === 0) failures = 0;
  pending++;
  notify();
  const done = (failed) => { pending = Math.max(0, pending - 1); if (failed) failures++; notify(); };
  let p;
  try { p = Promise.resolve(promiseFactory()); } catch (e) { done(true); throw e; }
  return p.then(
    (v) => { done(false); return v; },
    (e) => { done(true); throw e; },
  );
}

export const getPendingSaves = () => pending;
export const getSavingSnapshot = () => ({ pending, failed: failures > 0 });
export function subscribeSaving(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// The top bar registers itself so the fallback indicator knows it isn't needed.
export function registerSavingSlot() {
  slots++;
  notify();
  return () => { slots--; notify(); };
}
export const hasSavingSlot = () => slots > 0;
