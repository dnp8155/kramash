import { describe, it, expect } from "vitest";
import { parseClock, displayClockOrText } from "@/lib/daySchedule";

describe("parseClock (job sheet reporting time)", () => {
  it("reads typed times", () => {
    expect(parseClock("8:00 AM")).toBe("08:00");
    expect(parseClock("8 am")).toBe("08:00");
    expect(parseClock("8.30pm")).toBe("20:30");
    expect(parseClock("12:15 AM")).toBe("00:15");
    expect(parseClock("12 PM")).toBe("12:00");
    expect(parseClock("20:30")).toBe("20:30");
    expect(parseClock("08:00:00")).toBe("08:00");
  });
  it("gives empty for text that is not clearly a time", () => {
    expect(parseClock("")).toBe("");
    expect(parseClock("8")).toBe("");
    expect(parseClock("morning")).toBe("");
    expect(parseClock("25:00")).toBe("");
    expect(parseClock("13 pm")).toBe("");
  });
  it("shows picked times as 12-hour and old text as typed", () => {
    expect(displayClockOrText("08:00")).toBe("08:00 AM");
    expect(displayClockOrText("After lunch")).toBe("After lunch");
    expect(displayClockOrText("")).toBe("");
  });
});

describe("displayClockOrText with older typed text", () => {
  it("reads typed 12-hour text right", () => {
    expect(displayClockOrText("6:00 PM")).toBe("06:00 PM");
    expect(displayClockOrText("8 am")).toBe("08:00 AM");
  });
});

import { addOnDate } from "@/lib/dates";
describe("addOnDate", () => {
  it("uses the picked date, else the day it was added (from its id)", () => {
    expect(addOnDate({ id: "ao1", date: "2026-11-10" })).toBe("2026-11-10");
    expect(addOnDate({ id: `ao${Date.UTC(2026, 9, 5, 6, 0)}` })).toBe("2026-10-05");
    expect(addOnDate({ id: "x", name: "old" })).toBe("");
  });
});
