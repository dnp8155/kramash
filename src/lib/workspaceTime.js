// The workspace's timezone (Preferences → Profile & Workspace → Timezone; the Dashboard clock uses it too).
// Automatic and scheduled messages go out by this clock, not the device's or India's.

const LABELS = { "Asia/Kolkata": "Asia/India" }; // same wording as the Timezone setting

export const workspaceTz = (workspace) => workspace?.timezone || "Asia/Kolkata";
export const tzLabel = (tz) => LABELS[tz] || tz;

const partsIn = (ts, tz) => {
  const o = {};
  for (const p of new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ts))) o[p.type] = p.value;
  return o;
};

// How far ahead of UTC the timezone is at that moment, in ms.
const offsetMs = (ts, tz) => {
  const p = partsIn(ts, tz);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
};

// "2026-12-12T10:00" typed as a wall-clock time in `tz` → the real moment (ISO, UTC).
export function wallClockToUtcISO(local, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || "");
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - offsetMs(guess, tz);
  utc = guess - offsetMs(utc, tz); // second pass settles daylight-saving edges
  return new Date(utc).toISOString();
}

// Tomorrow at 10:00 in `tz`, as a datetime-local value.
export function defaultSendAtIn(tz) {
  const p = partsIn(Date.now() + 24 * 3600 * 1000, tz);
  return `${p.year}-${p.month}-${p.day}T10:00`;
}

export function formatInTz(iso, tz) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", timeZone: tz });
}
