import { describe, it, expect } from "vitest";
import { includedDates, datesInRange } from "@/lib/quotationCalc";
import { formatDatesList, formatAssignmentDates } from "@/lib/dates";
import { deriveEventDates } from "../supabase/functions/_shared/helpers.ts";

describe("includedDates (quotation range minus excluded days)", () => {
  it("drops excluded days", () => {
    expect(includedDates("2026-12-09", "2026-12-12", ["2026-12-10"])).toEqual(["2026-12-09", "2026-12-11", "2026-12-12"]);
  });
  it("crosses month and year boundaries", () => {
    expect(includedDates("2026-12-30", "2027-01-02", ["2026-12-31"])).toEqual(["2026-12-30", "2027-01-01", "2027-01-02"]);
  });
  it("ignores excluded days outside the range", () => {
    expect(includedDates("2026-12-09", "2026-12-10", ["2026-01-01"])).toEqual(["2026-12-09", "2026-12-10"]);
  });
  it("is empty for an inverted range", () => {
    expect(datesInRange("2026-12-12", "2026-12-09")).toEqual([]);
  });
});

describe("server deriveEventDates matches the app", () => {
  it("range minus excluded", () => {
    expect(deriveEventDates({ start_date: "2026-12-09", end_date: "2026-12-12", excluded_dates: ["2026-12-09"] }))
      .toEqual(["2026-12-10", "2026-12-11", "2026-12-12"]);
  });
  it("single day with no end date", () => {
    expect(deriveEventDates({ start_date: "2026-12-09" })).toEqual(["2026-12-09"]);
  });
  it("keeps the start day when every day is excluded", () => {
    expect(deriveEventDates({ start_date: "2026-12-09", excluded_dates: ["2026-12-09"] })).toEqual(["2026-12-09"]);
  });
  it("is not shifted by the server's timezone", () => {
    expect(deriveEventDates({ start_date: "2026-03-28", end_date: "2026-03-30" })).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"]);
  });
});

describe("assignment dates label", () => {
  it("lists every working day, not just first and last", () => {
    const a = { working_dates: ["2026-12-09", "2026-12-10", "2026-12-11", "2026-12-12"], booking_start_date: "2026-12-09", booking_end_date: "2026-12-12" };
    expect(formatAssignmentDates(a, {})).toBe("09, 10, 11, 12 Dec 2026");
    expect(formatDatesList(["2026-11-22", "2026-12-10"])).toContain("22 Nov");
  });
  it("skipped days are not filled in", () => {
    expect(formatAssignmentDates({ working_dates: ["2026-12-09", "2026-12-12"] }, {})).toBe("09, 12 Dec 2026");
  });
  it("falls back to the booking range when there are no working days", () => {
    expect(formatAssignmentDates({ booking_start_date: "2026-12-09", booking_end_date: "2026-12-09" }, {})).toMatch(/09/);
  });
});
