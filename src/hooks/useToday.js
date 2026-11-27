import { useSyncExternalStore } from "react";
import { todayISO, workspaceNow } from "@/lib/dates";

// The current day ("YYYY-MM-DD") in the WORKSPACE's timezone (Preferences → Profile & Workspace), not the device's.
// It flips by itself at that workspace's midnight, so everything that reads "today" — Today / In Progress sections,
// reminders, status dots, portal "changed today" labels, calendars — updates on screen without a reload.
//
// One shared clock for the whole app: a timer aimed at the next workspace midnight, plus a check every minute and
// whenever the app comes back on screen (phones pause timers while the app is in the background), and right away
// when the workspace's timezone changes (see notifyDayClock in WorkspaceContext).

let current = todayISO();
const listeners = new Set();
let midnightTimer = null;
let pollTimer = null;

function check() {
  const now = todayISO();
  if (now === current) return;
  current = now;
  listeners.forEach((fn) => fn());
  if (listeners.size) aimAtMidnight();
}

function aimAtMidnight() {
  clearTimeout(midnightTimer);
  const n = workspaceNow();
  const msLeft = ((23 - n.getHours()) * 3600 + (59 - n.getMinutes()) * 60 + (60 - n.getSeconds())) * 1000;
  // A second past midnight, so the new day has surely begun; capped so a sleeping device can't push it far off.
  midnightTimer = setTimeout(check, Math.min(Math.max(msLeft + 1000, 1000), 60 * 60 * 1000));
}

const onVisible = () => { if (document.visibilityState === "visible") check(); };

function start() {
  aimAtMidnight();
  pollTimer = setInterval(check, 60 * 1000);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", check);
}

function stop() {
  clearTimeout(midnightTimer);
  clearInterval(pollTimer);
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("focus", check);
}

function subscribe(fn) {
  if (listeners.size === 0) start();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stop();
  };
}

// Call after the workspace timezone changes: "today" may already be a different day there.
// The first call (the workspace loading) only sets the day for that timezone — no refetch right after start-up.
let synced = false;
let silentChange = false;
// True once, right after the start-up timezone sync changed the day: the app re-renders but skips the refetch.
export function consumeSilentDayChange() { const v = silentChange; silentChange = false; return v; }
export function notifyDayClock() {
  if (!synced) {
    synced = true;
    const now = todayISO();
    if (now !== current) { current = now; silentChange = true; listeners.forEach((fn) => fn()); }
  } else check();
  if (listeners.size) aimAtMidnight();
}

export function useToday() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
