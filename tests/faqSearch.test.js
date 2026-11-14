import { describe, it, expect } from "vitest";
import { faqContent, faqMatches, faqSearchTerms } from "@/constants/faqContent";

const titles = (q) => [...faqMatches(q)].map((i) => faqContent[i].q);

describe("FAQ search", () => {
  it("an empty search matches nothing, so the page shows every question", () => {
    expect(faqMatches("").size).toBe(0);
    expect(faqMatches("   ").size).toBe(0);
    expect(faqSearchTerms("  Payment   Reminder ")).toEqual(["payment", "reminder"]);
  });
  it("finds the Reminders vs Notifications answer, ignoring case", () => {
    expect(titles("REMINDERS notifications")).toContain("What is the difference between Reminders and Notifications?");
  });
  it("needs every word, in the question or the answer", () => {
    const loose = faqMatches("reminders").size;
    const tight = faqMatches("reminders gmail").size;
    expect(loose).toBeGreaterThan(0);
    expect(tight).toBeLessThanOrEqual(loose);
    expect(faqMatches("zzqxj nonsense").size).toBe(0);
  });
  it("searches answers too, not just questions", () => {
    // "Activity tab" only appears inside an answer
    expect(faqMatches("activity tab").size).toBeGreaterThan(0);
  });
  it("is not thrown off by link markup in answers", () => {
    expect(faqMatches("](#").size).toBe(0);
  });
});
