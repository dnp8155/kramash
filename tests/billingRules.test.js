import { describe, it, expect } from "vitest";
import { renewalBaseDate, isTestKey, workspaceInTestList } from "../supabase/functions/_shared/billingRules.ts";

describe("renewal never loses days", () => {
  const today = "2026-11-19";
  it("new Pro (no active plan) starts today", () => {
    expect(renewalBaseDate(today, [])).toBe(today);
    expect(renewalBaseDate(today, null)).toBe(today);
  });
  it("paying while Pro carries on from the current end date", () => {
    expect(renewalBaseDate(today, [{ expires_at: "2026-12-09" }])).toBe("2026-12-09");
    expect(renewalBaseDate(today, [{ expires_at: "2026-12-09T00:00:00Z" }, { expires_at: "2027-01-05" }])).toBe("2027-01-05");
  });
  it("an end date already passed (or missing) counts as no time left", () => {
    expect(renewalBaseDate(today, [{ expires_at: "2026-11-01" }])).toBe(today);
    expect(renewalBaseDate(today, [{ expires_at: null }, { expires_at: "" }])).toBe(today);
    expect(renewalBaseDate(today, [{ expires_at: today }])).toBe(today);
  });
});

describe("test keys are locked to the test workspaces", () => {
  it("recognises Razorpay test keys", () => {
    expect(isTestKey("rzp_test_abc")).toBe(true);
    expect(isTestKey("rzp_live_abc")).toBe(false);
    expect(isTestKey("")).toBe(false);
  });
  it("reads the comma-separated list", () => {
    expect(workspaceInTestList("w1", "w1")).toBe(true);
    expect(workspaceInTestList("w2", " w1 , w2 ")).toBe(true);
    expect(workspaceInTestList("w3", "w1,w2")).toBe(false);
    expect(workspaceInTestList("w1", "")).toBe(false);
    expect(workspaceInTestList("", "w1")).toBe(false);
  });
});

import { expiryReminderStage, expiryReminderText } from "../supabase/functions/_shared/billingRules.ts";

describe("Pro expiry reminders", () => {
  it("one reminder each at 10, 7, 3, 1 day left and on the last day", () => {
    expect(expiryReminderStage(11)).toBeNull();
    expect(expiryReminderStage(10)).toBe("10d");
    expect(expiryReminderStage(8)).toBe("10d");
    expect(expiryReminderStage(7)).toBe("7d");
    expect(expiryReminderStage(4)).toBe("7d");
    expect(expiryReminderStage(3)).toBe("3d");
    expect(expiryReminderStage(2)).toBe("3d");
    expect(expiryReminderStage(1)).toBe("1d");
    expect(expiryReminderStage(0)).toBe("today");
    expect(expiryReminderStage(-1)).toBeNull();
  });
  it("the last day says today, not 'in 1 day'", () => {
    expect(expiryReminderText(0, "19 Nov 2026", false)).toMatchObject({ title: "Pro ends today" });
    expect(expiryReminderText(0, "19 Nov 2026", false).message).toMatch(/ends today \(19 Nov 2026\)/);
    expect(expiryReminderText(1, "20 Nov 2026", false).title).toBe("Pro ends tomorrow");
    expect(expiryReminderText(10, "29 Nov 2026", false)).toMatchObject({ title: "Pro plan expiring soon" });
    expect(expiryReminderText(10, "29 Nov 2026", false).message).toMatch(/in 10 days/);
  });
  it("renewing early is explained, so owners know they lose no days", () => {
    expect(expiryReminderText(7, "26 Nov 2026", false).message).toMatch(/lose no days/);
  });
  it("launch month keeps its own wording", () => {
    expect(expiryReminderText(3, "22 Nov 2026", true).title).toBe("Your free launch month is ending soon");
    expect(expiryReminderText(0, "19 Nov 2026", true).title).toBe("Your free launch month ends today");
  });
});
