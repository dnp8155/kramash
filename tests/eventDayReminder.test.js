import { describe, it, expect } from "vitest";
import { dueNow, eventDayWhen, reminderText, fmtTime } from "../supabase/functions/_shared/eventDayReminder.ts";

const CATCH = 180;
const mins = (h, m = 0) => h * 60 + m;

describe("event-day reminder rules", () => {
  it("reads the one preference, and older saved keys", () => {
    expect(eventDayWhen({})).toBe("");
    expect(eventDayWhen({ event_day_when: "" })).toBe("");
    expect(eventDayWhen({ event_day_when: "time" })).toBe("time");
    expect(eventDayWhen({ event_day_when: "60" })).toBe("60");
    expect(eventDayWhen({ event_day_reminder: true })).toBe("time");
    expect(eventDayWhen({ event_lead_minutes: "120" })).toBe("120");
    // the new key wins over old ones, even when it is switched off
    expect(eventDayWhen({ event_day_when: "", event_day_reminder: true, event_lead_minutes: "60" })).toBe("");
  });

  it("is off unless Events and in-app are on", () => {
    const now = mins(9);
    expect(dueNow({}, "10:00", now, true, CATCH).due).toBe(false);
    expect(dueNow({ event_day_when: "time", events: false }, "", now, true, CATCH).due).toBe(false);
    expect(dueNow({ event_day_when: "time", in_app: false }, "", now, true, CATCH).due).toBe(false);
  });

  it("at a set time: from that time, and the cron stops after the catch-up window", () => {
    const prefs = { event_day_when: "time", event_day_time: "08:00" };
    expect(dueNow(prefs, "", mins(7, 59), true, CATCH).due).toBe(false);
    expect(dueNow(prefs, "", mins(8), true, CATCH).due).toBe(true);
    expect(dueNow(prefs, "", mins(10, 59), true, CATCH).due).toBe(true);
    expect(dueNow(prefs, "", mins(11), true, CATCH).due).toBe(false);
    // opening the app later in the day still fills in what is due
    expect(dueNow(prefs, "", mins(15), false, CATCH).due).toBe(true);
    // default time is 08:00
    expect(dueNow({ event_day_when: "time" }, "", mins(8), true, CATCH).due).toBe(true);
  });

  it("before the start: at the last half-hour check at or before start minus the lead, until the start", () => {
    const prefs = { event_day_when: "60" };
    expect(dueNow(prefs, "16:30", mins(15), true, CATCH).due).toBe(false);
    // 4:45 start, 1 hour before → the 3:30 check (75 min early), not 4:00 (only 45 min early)
    expect(dueNow(prefs, "16:45", mins(15), true, CATCH).due).toBe(false);
    expect(dueNow(prefs, "16:45", mins(15, 30), true, CATCH).due).toBe(true);
    // 30 min before a 10:10 start → the 9:30 check; a missed 9:30 check is caught up at 10:00
    expect(dueNow({ event_day_when: "30" }, "10:10", mins(9), true, CATCH).due).toBe(false);
    expect(dueNow({ event_day_when: "30" }, "10:10", mins(9, 30), true, CATCH).due).toBe(true);
    expect(dueNow({ event_day_when: "30" }, "10:10", mins(10), true, CATCH).due).toBe(true);
    expect(dueNow(prefs, "16:30", mins(15, 30), true, CATCH)).toEqual({ due: true, beforeStart: true });
    expect(dueNow(prefs, "16:30", mins(16, 29), true, CATCH).due).toBe(true);
    expect(dueNow(prefs, "16:30", mins(16, 30), true, CATCH).due).toBe(false); // already started
    expect(dueNow({ event_day_when: "180" }, "01:00", mins(0, 0), true, CATCH).due).toBe(true); // lead reaches before midnight
  });

  it("before the start with no start time falls back to the chosen time of day", () => {
    const prefs = { event_day_when: "60", event_day_time: "09:00" };
    expect(dueNow(prefs, "", mins(8, 59), true, CATCH).due).toBe(false);
    expect(dueNow(prefs, "", mins(9), true, CATCH)).toEqual({ due: true, beforeStart: false });
  });

  it("words the reminder with the time, end time and venue when there are any", () => {
    expect(fmtTime("16:30")).toBe("04:30 PM");
    expect(fmtTime("00:05")).toBe("12:05 AM");
    expect(reminderText({ title: "Sharma Wedding", venue: "Grand Hall" }, "16:30", "21:00", true)).toEqual({
      title: "Starts at 04:30 PM: Sharma Wedding",
      message: '"Sharma Wedding" is today at 04:30 PM – 09:00 PM, Grand Hall.',
    });
    expect(reminderText({ title: "Shoot" }, "", "", false)).toEqual({ title: "Today: Shoot", message: '"Shoot" is today.' });
    expect(reminderText({ title: "Shoot" }, "10:00", "", false).title).toBe("Today: Shoot");
  });
});
