import { describe, it, expect } from "vitest";
import { quotationDayTitles, effectiveDayTitle } from "@/lib/daySchedule";

describe("day titles", () => {
  const items = [
    { day_date: "2026-03-12", phase_title: "Haldi" },
    { day_date: "2026-03-12", phase_title: "" },
    { day_date: "2026-03-13", phase_title: "  Wedding " },
    { day_date: "2026-03-14", phase_title: "__includes__" },
    { day_date: "uncategorized", phase_title: "Misc" },
    { day_date: "2026-03-15" },
  ];
  it("takes one title per date from the quotation, skipping include rows and undated items", () => {
    expect(quotationDayTitles(items)).toEqual({ "2026-03-12": "Haldi", "2026-03-13": "Wedding" });
    expect(quotationDayTitles()).toEqual({});
  });
  it("a title typed on the day plan wins over the quotation's", () => {
    const q = { "2026-03-12": "Haldi" };
    expect(effectiveDayTitle({ title: "Mehendi" }, q, "2026-03-12")).toBe("Mehendi");
    expect(effectiveDayTitle({ title: "  " }, q, "2026-03-12")).toBe("Haldi");
    expect(effectiveDayTitle(undefined, q, "2026-03-12")).toBe("Haldi");
    expect(effectiveDayTitle(undefined, q, "2026-03-20")).toBe("");
  });
});

import { eventDayList } from "@/lib/dates";
describe("eventDayList", () => {
  it("uses the picked dates, sorted and without repeats", () => {
    expect(eventDayList({ event_dates: ["2026-03-14", "2026-03-12", "2026-03-12"] })).toEqual(["2026-03-12", "2026-03-14"]);
  });
  it("expands a start-to-end range when no dates were picked", () => {
    expect(eventDayList({ start_date: "2026-03-12", end_date: "2026-03-14" })).toEqual(["2026-03-12", "2026-03-13", "2026-03-14"]);
  });
  it("falls back to a single day, or none", () => {
    expect(eventDayList({ start_date: "2026-03-12" })).toEqual(["2026-03-12"]);
    expect(eventDayList({ start_date: "2026-03-12", end_date: "2026-03-10" })).toEqual(["2026-03-12"]);
    expect(eventDayList({})).toEqual([]);
    expect(eventDayList(null)).toEqual([]);
  });
});

import { hhmm, formatClock, formatTimeRange, effectiveDayTime } from "@/lib/daySchedule";

describe("day times", () => {
  it("formats like the Dashboard clock", () => {
    expect(hhmm("16:30:00")).toBe("16:30");
    expect(hhmm(null)).toBe("");
    expect(formatClock("16:30:00")).toBe("04:30 PM");
    expect(formatClock("00:05")).toBe("12:05 AM");
    expect(formatTimeRange("10:00", "12:30")).toBe("10:00 AM – 12:30 PM");
    expect(formatTimeRange("10:00", "")).toBe("10:00 AM");
    expect(formatTimeRange("", "12:30")).toBe("");
  });
  it("uses the day's own time, else the event's", () => {
    const ev = { start_time: "09:00:00", end_time: "11:00:00" };
    expect(effectiveDayTime({ start_time: "18:00:00", end_time: null }, ev)).toEqual({ start: "18:00", end: "", own: true });
    expect(effectiveDayTime({}, ev)).toEqual({ start: "09:00", end: "11:00", own: false });
    expect(effectiveDayTime(undefined, {})).toEqual({ start: "", end: "", own: false });
  });
});

import { quotationDayTimes } from "@/lib/daySchedule";

describe("quotation day times", () => {
  it("takes one time per date, skipping undated and include lines", () => {
    const items = [
      { day_date: "2026-03-12", day_start_time: "10:00:00", day_end_time: "12:00:00" },
      { day_date: "2026-03-12", day_start_time: "10:00:00" },
      { day_date: "2026-03-13", day_start_time: null },
      { day_date: "uncategorized", day_start_time: "09:00" },
      { day_date: "2026-03-14", day_start_time: "18:00", day_end_time: null },
    ];
    expect(quotationDayTimes(items)).toEqual({ "2026-03-12": { start: "10:00", end: "12:00" }, "2026-03-14": { start: "18:00", end: "" } });
    expect(quotationDayTimes()).toEqual({});
  });
});

import { shareTimingLines, eventTimeOn } from "@/lib/daySchedule";

describe("share message timing and calendar time", () => {
  const event = { id: "e1", start_time: "09:00:00", end_time: "11:00:00" };
  const days = [{ event_id: "e1", date: "2026-12-25", start_time: "19:00:00", end_time: "23:00:00", title: "Reception" }];
  it("one day reads Time: …; several list each timed date; none gives nothing", () => {
    expect(shareTimingLines(["2026-12-25"], days, event)).toEqual(["Time: 07:00 PM – 11:00 PM"]);
    expect(shareTimingLines(["2026-12-24"], days, event)).toEqual(["Time: 09:00 AM – 11:00 AM"]);
    expect(shareTimingLines(["2026-12-24", "2026-12-25"], days, event)).toEqual([
      expect.stringMatching(/^Thu, 24 Dec: 09:00 AM – 11:00 AM$/),
      expect.stringMatching(/^Fri, 25 Dec \(Reception\): 07:00 PM – 11:00 PM$/),
    ]);
    expect(shareTimingLines(["2026-12-24"], [], { id: "e1" })).toEqual([]);
    expect(shareTimingLines(undefined, undefined, undefined)).toEqual([]);
  });
  it("calendar time is the day's own, else the event's, and only for that event", () => {
    expect(eventTimeOn(event, "2026-12-25", days)).toBe("07:00 PM – 11:00 PM");
    expect(eventTimeOn(event, "2026-12-24", days)).toBe("09:00 AM – 11:00 AM");
    expect(eventTimeOn({ id: "other" }, "2026-12-25", days)).toBe("");
  });
});
