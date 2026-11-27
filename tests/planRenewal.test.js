// Your Plan → paid Pro renews only in its last 30 days (prices may change). Same rule in the app and on the server.
import { describe, it, expect } from "vitest";
import { renewalWindow, addMonthsIso, addDaysIso } from "@/lib/planRenewal";
import { renewalTooEarly, shortDate } from "../supabase/functions/_shared/billingRules.ts";

const paid = (end) => ({ source: "PAYMENT_GATEWAY", expires_at: end });

describe("renewal window (app)", () => {
  it("paid Pro with more than 30 days left: not open, opens 30 days before the end", () => {
    const w = renewalWindow({ isPro: true, expiresAt: "2027-03-27", source: "PAYMENT_GATEWAY", today: "2026-11-27" });
    expect(w).toMatchObject({ end: "2027-03-27", opensOn: "2027-02-25", tooEarly: true, daysLeft: 120 });
  });
  it("30 days or less left: open", () => {
    expect(renewalWindow({ isPro: true, expiresAt: "2026-12-27", source: "PAYMENT_GATEWAY", today: "2026-11-27" }).tooEarly).toBe(false);
    expect(renewalWindow({ isPro: true, expiresAt: "2026-12-28", source: "PAYMENT_GATEWAY", today: "2026-11-27" }).tooEarly).toBe(true);
  });
  it("admin-given or launch-month Pro is never held back", () => {
    for (const source of ["ADMIN", "PROMOTIONAL"]) {
      expect(renewalWindow({ isPro: true, expiresAt: "2027-06-01", source, today: "2026-11-27" }).tooEarly).toBe(false);
    }
  });
  it("an end date already past (exempt admin with an old row): no window, no negative days", () => {
    expect(renewalWindow({ isPro: true, expiresAt: "2026-10-01", source: "PAYMENT_GATEWAY", today: "2026-11-27" })).toBeNull();
    expect(renewalWindow({ isPro: true, expiresAt: "2026-11-27", source: "PAYMENT_GATEWAY", today: "2026-11-27" }).daysLeft).toBe(0);
  });
  it("Free or expired: no window", () => {
    expect(renewalWindow({ isPro: false, expiresAt: "2027-06-01", source: "PAYMENT_GATEWAY", today: "2026-11-27" })).toBeNull();
  });
  it("new end date uses the server's month maths", () => {
    expect(addMonthsIso("2027-03-27", 6)).toBe("2027-09-27");
    expect(addMonthsIso("2027-01-31", 1)).toBe("2027-02-28");
    expect(addDaysIso("2027-03-01", -30)).toBe("2027-01-30");
  });
});

describe("renewal window (server, createPaymentOrder)", () => {
  it("refuses paid Pro with more than 30 days left, with the opening date", () => {
    expect(renewalTooEarly("2026-11-27", [paid("2027-03-27")])).toEqual({ end: "2027-03-27", opensOn: "2027-02-25" });
    expect(shortDate("2027-02-25")).toBe("25 Feb 2027");
  });
  it("allows within 30 days (one day of slack for India vs UTC midnight)", () => {
    expect(renewalTooEarly("2026-11-27", [paid("2026-12-27")])).toBeNull();
    expect(renewalTooEarly("2026-11-27", [paid("2026-12-28")])).toBeNull();
    expect(renewalTooEarly("2026-11-27", [paid("2026-12-29")])).not.toBeNull();
  });
  it("uses the latest paid end; admin / launch Pro doesn't count", () => {
    expect(renewalTooEarly("2026-11-27", [paid("2026-12-10"), paid("2027-06-10")])?.end).toBe("2027-06-10");
    expect(renewalTooEarly("2026-11-27", [{ source: "ADMIN", expires_at: "2027-06-10" }, { source: "PROMOTIONAL", expires_at: "2027-01-10" }])).toBeNull();
    expect(renewalTooEarly("2026-11-27", [])).toBeNull();
  });
});
