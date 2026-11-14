import { describe, it, expect } from "vitest";
import { isReservedSlug } from "@/lib/profileSlug";

describe("reserved public profile URLs", () => {
  it("blocks the app name, even inside a longer name", () => {
    expect(isReservedSlug("kramasha")).toBe(true);
    expect(isReservedSlug("Kramasha-Official")).toBe(true);
    expect(isReservedSlug("my-kramash-studio")).toBe(true);
  });
  it("blocks generic placeholder names, ignoring digits and hyphens", () => {
    for (const s of ["anon", "anonymous", "unknown", "un-known", "anon-123", "admin2", "your-business"]) expect(isReservedSlug(s)).toBe(true);
  });
  it("allows real business names", () => {
    for (const s of ["krishna-shah-photography", "studio-9", "lad-interiors", "anonymous-films-co", ""]) expect(isReservedSlug(s)).toBe(false);
  });
});
