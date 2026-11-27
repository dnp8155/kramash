// Rules for the on-the-day event reminder (Preferences → Notifications → "On the day of the event").
// Kept free of any database or Deno code so the rules can be tested.

export const fmtTime = (hhmm: string) => {
  const [h, mi] = hhmm.split(":").map((x) => parseInt(x, 10) || 0);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(mi).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// The cron runs every 30 minutes (on :00 and :30).
export const CHECK_GAP_MINUTES = 30;

export const toMinutes = (hhmm: string) => {
  const [h, mi] = String(hhmm).split(":");
  return (parseInt(h, 10) || 0) * 60 + (parseInt(mi, 10) || 0);
};

// "" = off, "time" = at the chosen time of day, "30" / "60" / "120" / "180" = that many minutes before the start.
// Older saved preferences (event_day_reminder / event_lead_minutes) still count.
export const eventDayWhen = (prefs: any): string => {
  if (prefs.event_day_when !== undefined) return String(prefs.event_day_when || "");
  if (prefs.event_lead_minutes) return String(prefs.event_lead_minutes);
  return prefs.event_day_reminder === true ? "time" : "";
};

// Is it time to send today's reminder for one event? `startAt` is that day's start time ("HH:MM" or "").
// Before the start: the server checks only on the hour and half hour, so the reminder goes out at the last check at or
// before (start - lead) — "1 hour before" a 4:45 start arrives at 3:30, never later than an hour before. If that check
// is missed, any later check still sends it until the event starts. Otherwise at the chosen time of day — also used when
// "before the start" is chosen but the day has no start time. The cron only sends within `catchUp` minutes after the time.
export function dueNow(
  prefs: any, startAt: string, nowMinutes: number, isCron: boolean, catchUp: number,
): { due: boolean; beforeStart: boolean } {
  const mode = eventDayWhen(prefs);
  if (!mode || prefs.events === false || prefs.in_app === false) return { due: false, beforeStart: false };
  const lead = mode === "time" ? 0 : parseInt(mode, 10) || 0;
  if (lead && startAt) {
    const startMinutes = toMinutes(startAt);
    return { due: nowMinutes >= startMinutes - lead - CHECK_GAP_MINUTES + 1 && nowMinutes < startMinutes, beforeStart: true };
  }
  const dayMinutes = toMinutes(prefs.event_day_time || "08:00");
  return { due: nowMinutes >= dayMinutes && !(isCron && nowMinutes >= dayMinutes + catchUp), beforeStart: false };
}

export function reminderText(ev: { title?: string; venue?: string }, startAt: string, endAt: string, beforeStart: boolean) {
  const timing = startAt ? ` at ${fmtTime(startAt)}${endAt ? ` – ${fmtTime(endAt)}` : ""}` : "";
  return {
    title: beforeStart && startAt ? `Starts at ${fmtTime(startAt)}: ${ev.title}` : `Today: ${ev.title}`,
    message: `"${ev.title}" is today${timing}${ev.venue ? `, ${ev.venue}` : ""}.`,
  };
}
