import { describe, it, expect } from "vitest";
import { suggestedRate } from "@/lib/suggestedRate";

describe("suggestedRate", () => {
  it("multiplies Per Day by the working days", () => {
    expect(suggestedRate("Per Day", 2000, 3)).toBe("6000");
    expect(suggestedRate("Per Day", "2500", 2)).toBe("5000");
  });
  it("treats zero or missing days as one day", () => {
    expect(suggestedRate("Per Day", 2000, 0)).toBe("2000");
    expect(suggestedRate("Per Day", 2000, undefined)).toBe("2000");
  });
  it("does not multiply Per Event or Fixed", () => {
    expect(suggestedRate("Per Event", 5000, 4)).toBe("5000");
    expect(suggestedRate("Fixed", 5000, 4)).toBe("5000");
  });
  it("rounds float noise to 2 decimals", () => {
    expect(suggestedRate("Per Day", 1499.99, 3)).toBe("4499.97");
    expect(suggestedRate("Per Day", 0.1, 3)).toBe("0.3");
  });
  it("returns blank when there is no rate", () => {
    expect(suggestedRate("Per Day", null, 3)).toBe("");
    expect(suggestedRate("Per Day", "", 3)).toBe("");
    expect(suggestedRate("Per Day", undefined, 3)).toBe("");
  });
  it("keeps an explicit zero rate", () => {
    expect(suggestedRate("Per Day", 0, 3)).toBe("0");
  });
});
