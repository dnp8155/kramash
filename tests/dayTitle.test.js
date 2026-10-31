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
