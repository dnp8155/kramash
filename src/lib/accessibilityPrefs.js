// Per-device accessibility preferences (localStorage, not per workspace): a text size and
// where tapping the logo goes. Text size scales the root font size, so everything sized in rem
// follows it; px-sized bits stay put (hence the beta tag).
import { useSyncExternalStore } from "react";

const KEY = "accessibility-prefs";
const CHANGE_EVENT = "accessibility-prefs-change";

export const TEXT_SIZES = [
  { value: "small", label: "Small", scale: 90 },
  { value: "medium", label: "Medium", scale: 100 },
  { value: "large", label: "Large", scale: 115 },
];
export const LOGO_TARGETS = [
  { value: "off", label: "Off" },
  { value: "dashboard", label: "Dashboard", path: "/dashboard" },
  { value: "events", label: "Events", path: "/events" },
];
const DEFAULTS = { textSize: "medium", logoTarget: "off" };

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const out = { ...DEFAULTS };
    if (TEXT_SIZES.some((s) => s.value === raw.textSize)) out.textSize = raw.textSize;
    if (LOGO_TARGETS.some((l) => l.value === raw.logoTarget)) out.logoTarget = raw.logoTarget;
    else if (raw.logoGoesToEvents) out.logoTarget = "events"; // earlier toggle
    return out;
  } catch { return DEFAULTS; }
};

// useSyncExternalStore needs a stable snapshot between changes.
let cache = null;
const snapshot = () => {
  const next = read();
  if (!cache || cache.textSize !== next.textSize || cache.logoTarget !== next.logoTarget) cache = next;
  return cache;
};

const subscribe = (cb) => {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(CHANGE_EVENT, cb); window.removeEventListener("storage", cb); };
};

export function applyTextSize(size = snapshot().textSize) {
  if (typeof document === "undefined") return;
  const scale = TEXT_SIZES.find((s) => s.value === size)?.scale ?? 100;
  document.documentElement.style.fontSize = scale === 100 ? "" : `${scale}%`;
}

export function setAccessibilityPref(patch) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch })); } catch { /* ignore */ }
  if ("textSize" in patch) applyTextSize(patch.textSize);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useAccessibilityPrefs() {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
}
