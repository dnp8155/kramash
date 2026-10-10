import { describe, it, expect } from "vitest";
import { backFallbackFor } from "@/lib/smartBack";

describe("backFallbackFor (where Back goes when there is no history)", () => {
  it("a detail page goes to its list", () => {
    expect(backFallbackFor("/events/abc123")).toBe("/events");
    expect(backFallbackFor("/team/42")).toBe("/team");
    expect(backFallbackFor("/quotation/q1")).toBe("/quotation");
  });
  it("a deeper page goes to its section", () => {
    expect(backFallbackFor("/events/abc123/job-sheet")).toBe("/events");
  });
  it("a top-level page goes to the dashboard", () => {
    expect(backFallbackFor("/financial")).toBe("/dashboard");
    expect(backFallbackFor("/")).toBe("/dashboard");
  });
});
