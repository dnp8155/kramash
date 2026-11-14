import { describe, it, expect, beforeEach } from "vitest";
import { workspaceNow, setWorkspaceTimezone, toISODate, todayISO } from "../src/lib/dates.js";
import { todayInTz, formatDatesByPref, moneyText } from "../supabase/functions/_shared/helpers.ts";

// 21:00 UTC on 8 Nov 2026
const AT = new Date("2026-11-08T21:00:00Z");

describe("workspace timezone (frontend)", () => {
  beforeEach(() => setWorkspaceTimezone("Asia/Kolkata"));

  it("reads 'today' on the workspace's own clock", () => {
    setWorkspaceTimezone("Asia/Dubai"); // UTC+4 -> 9 Nov, 01:00
    expect(toISODate(workspaceNow(AT))).toBe("2026-11-09");
    expect(workspaceNow(AT).getHours()).toBe(1);
    setWorkspaceTimezone("Asia/Kolkata"); // UTC+5:30 -> 9 Nov, 02:30
    expect(toISODate(workspaceNow(AT))).toBe("2026-11-09");
    expect(workspaceNow(AT).getHours()).toBe(2);
    setWorkspaceTimezone("America/New_York"); // UTC-5 -> 8 Nov, 16:00
    expect(toISODate(workspaceNow(AT))).toBe("2026-11-08");
    expect(workspaceNow(AT).getHours()).toBe(16);
  });

  it("falls back to India time for a missing or invalid zone", () => {
    setWorkspaceTimezone("Not/AZone");
    expect(toISODate(workspaceNow(AT))).toBe("2026-11-09");
    setWorkspaceTimezone(undefined);
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("workspace timezone (reminder server helpers)", () => {
  it("judges today per workspace zone", () => {
    expect(todayInTz("Asia/Dubai", AT)).toBe("2026-11-09");
    expect(todayInTz("America/New_York", AT)).toBe("2026-11-08");
    expect(todayInTz(null, AT)).toBe("2026-11-09");
    expect(todayInTz("bad", AT)).toBe("2026-11-09");
  });

  it("writes dates in the workspace's chosen format", () => {
    expect(formatDatesByPref(["2026-12-31"], "DD/MM/YYYY")).toBe("31/12/2026");
    expect(formatDatesByPref(["2026-12-31"], "MM/DD/YYYY")).toBe("12/31/2026");
    expect(formatDatesByPref(["2026-12-31"], "YYYY-MM-DD")).toBe("2026-12-31");
    expect(formatDatesByPref(["2026-12-30", "2026-12-31"], "DD/MM/YYYY")).toBe("30/12/2026, 31/12/2026");
    expect(formatDatesByPref(["2026-12-31"], "DD MMM YYYY")).toContain("Dec");
  });

  it("writes money in the workspace's currency", () => {
    expect(moneyText(1200, "INR")).toBe("₹1,200");
    expect(moneyText(1200, "AED")).toBe("AED 1,200");
    expect(moneyText(1200, "USD")).toBe("$1,200");
  });
});
