import { describe, it, expect } from "vitest";
import { lookupCity } from "@/lib/cityMapping";
import { TIMEZONES, TIMEZONES_CORE, CURRENCY_TIMEZONE } from "@/constants/regions";

describe("regions", () => {
  it("time zones are the original ones, matched to the currencies", () => {
    expect(TIMEZONES_CORE.map((t) => t.v)).toEqual(["Asia/Kolkata", "UTC", "Asia/Dubai", "America/New_York"]);
    expect(TIMEZONES.map((t) => t.v)).toEqual([...TIMEZONES_CORE.map((t) => t.v), "Europe/London", "Australia/Sydney"]);
    for (const tz of Object.values(CURRENCY_TIMEZONE)) expect(TIMEZONES_CORE.some((t) => t.v === tz)).toBe(true);
  });
  it("still finds Indian cities", () => {
    expect(lookupCity("Vadodara")).toEqual({ state: "Gujarat", country: "India" });
    expect(lookupCity(" Mumbai ").state).toBe("Maharashtra");
  });
  it("finds cities outside India with the currency the app offers", () => {
    expect(lookupCity("Dubai")).toMatchObject({ country: "United Arab Emirates", currency: "AED" });
    expect(lookupCity("Chicago")).toMatchObject({ country: "United States", currency: "USD" });
    expect(lookupCity("Paris")).toMatchObject({ country: "France", currency: "EUR" });
    expect(lookupCity("London").currency).toBeUndefined(); // GBP is not an option in the app
    expect(lookupCity("Dubai").timezone).toBeUndefined();
  });
});
