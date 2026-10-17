import { describe, it, expect } from "vitest";
import { getActiveLaunchOffer, launchOfferDaysLeft, LAUNCH_OFFER, SHOW_FREE_MONTH_NOTE, FREE_MONTH_SHORT, LAUNCH_FREE_MONTH_CAP } from "@/constants/launchOffer";

const at = (iso) => new Date(`${iso}T12:00:00`);

describe("festive launch offer", () => {
  it("uses the Navratri look until Dussehra, then Diwali", () => {
    expect(getActiveLaunchOffer(at("2026-10-12")).theme).toBe("navratri");
    expect(getActiveLaunchOffer(at(LAUNCH_OFFER.navratriEndsOn)).theme).toBe("navratri");
    expect(getActiveLaunchOffer(at("2026-10-21")).theme).toBe("diwali");
  });

  it("switches itself off after the end date and counts days inclusively", () => {
    expect(launchOfferDaysLeft(at(LAUNCH_OFFER.endsOn))).toBe(1);
    expect(getActiveLaunchOffer(new Date(`${LAUNCH_OFFER.endsOn}T23:00:00`)).daysLeft).toBe(1);
    expect(getActiveLaunchOffer(at("2026-12-11"))).toBeNull();
  });

  it("matches the agreed prices and discounts", () => {
    expect(LAUNCH_OFFER.listPrices).toEqual({ MONTHLY: 299, SIX_MONTHS: 1599, ANNUAL: 2999 });
    const pct = (offer, list) => Math.round((1 - offer / list) * 100);
    expect([pct(249, 299), pct(1199, 1599), pct(2199, 2999)]).toEqual([17, 25, 27]);
  });

  it("has copy for both themes and the free-month wording", () => {
    const offer = getActiveLaunchOffer(at("2026-10-12"));
    expect(offer.copy.title).toBeTruthy();
    expect(LAUNCH_OFFER.themes.diwali.title).toBeTruthy();
    expect(SHOW_FREE_MONTH_NOTE).toBe(true);
    expect(FREE_MONTH_SHORT).toMatch(/1 month of Pro free/);
    expect(LAUNCH_FREE_MONTH_CAP).toBeGreaterThanOrEqual(70);
    expect(LAUNCH_FREE_MONTH_CAP).toBeLessThanOrEqual(90);
  });
});

describe("FAQ price answer", () => {
  it("shows launch prices (and the regular ones) while the offer runs", async () => {
    const { proPriceAnswer } = await import("@/constants/faqContent");
    const a = proPriceAnswer(new Date("2026-10-12T12:00:00"));
    expect(a).toContain("₹249"); expect(a).toContain("₹1,199"); expect(a).toContain("₹2,199");
    expect(a).toContain("₹299"); expect(a).toContain("₹1,599"); expect(a).toContain("₹2,999");
    expect(a).toContain("10 December 2026");
  });
  it("shows only the regular prices once the offer is over", async () => {
    const { proPriceAnswer } = await import("@/constants/faqContent");
    const a = proPriceAnswer(new Date("2026-12-11T12:00:00"));
    expect(a).toContain("₹299"); expect(a).toContain("₹2,999");
    expect(a).not.toContain("₹249"); expect(a).not.toContain("Launch prices");
  });
});
