import { describe, it, expect } from "vitest";
import { planValidity } from "../src/lib/planValidity.js";

const at = (ymd) => new Date(`${ymd}T12:00:00`);
const sub = (started_at, expires_at, extra = {}) => ({ started_at, expires_at, source: "PAYMENT_GATEWAY", billing_cycle_snapshot: "MONTHLY", ...extra });

describe("plan validity on Your Plan", () => {
  it("counts days left, valid through the end of the expiry day", () => {
    const v = planValidity(sub("2026-11-01", "2026-12-01"), at("2026-11-19"));
    expect(v).toMatchObject({ daysLeft: 12, headline: "12 days left", tone: "ok", expired: false, expiresAt: "2026-12-01", startedAt: "2026-11-01" });
  });
  it("last day, one day, and the warning tones", () => {
    expect(planValidity(sub("2026-11-01", "2026-11-19"), at("2026-11-19"))).toMatchObject({ daysLeft: 0, headline: "Last day of Pro today", tone: "urgent" });
    expect(planValidity(sub("2026-11-01", "2026-11-20"), at("2026-11-19"))).toMatchObject({ headline: "1 day left", tone: "urgent" });
    expect(planValidity(sub("2026-11-01", "2026-11-25"), at("2026-11-19")).tone).toBe("soon");
  });
  it("after the expiry day it reads as ended", () => {
    expect(planValidity(sub("2026-10-01", "2026-11-18"), at("2026-11-19"))).toMatchObject({ expired: true, tone: "expired", headline: "Pro has ended", usedPercent: 100 });
  });
  it("the bar shows how much of the period is used", () => {
    expect(planValidity(sub("2026-11-01", "2026-11-10"), at("2026-11-05")).usedPercent).toBe(50);
    expect(planValidity(sub("2026-11-19", "2027-11-19"), at("2026-11-19")).usedPercent).toBe(0);
  });
  it("says how Pro was started", () => {
    expect(planValidity(sub("2026-11-01", "2026-12-01", { source: "PROMOTIONAL" }), at("2026-11-19")).source).toBe("Free launch month");
    expect(planValidity(sub("2026-11-01", "2026-12-01", { source: "ADMIN" }), at("2026-11-19")).source).toBe("Activated by Kramasha");
  });
  it("nothing to show without an end date", () => {
    expect(planValidity(null)).toBeNull();
    expect(planValidity({ started_at: "2026-11-01" })).toBeNull();
  });
});

describe("plan validity follows the subscription status", () => {
  it("a cancelled or expired subscription reads as ended even with days on the clock", () => {
    const v = planValidity({ started_at: "2026-11-01", expires_at: "2026-12-30", status: "CANCELLED" }, new Date("2026-11-19T12:00:00"));
    expect(v).toMatchObject({ expired: true, tone: "expired", headline: "Pro has ended" });
    expect(planValidity({ started_at: "2026-11-01", expires_at: "2026-12-30", status: "EXPIRED" }, new Date("2026-11-19T12:00:00")).expired).toBe(true);
    expect(planValidity({ started_at: "2026-11-01", expires_at: "2026-12-30", status: "ACTIVE" }, new Date("2026-11-19T12:00:00")).expired).toBe(false);
  });
});
