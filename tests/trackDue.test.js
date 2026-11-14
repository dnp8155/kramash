import { describe, it, expect } from "vitest";
import { normalizeDueRules, dueDaysFor, expectedDateFor, quotationSuggestions } from "@/lib/trackDue";
import { INCLUDES_MARK } from "@/lib/quotationCalc";

const rules = { rules: [{ word: "Album", days: 45 }, { word: "video", days: 30 }], otherDays: 20 };
const wedding = { event_dates: ["2026-12-04", "2026-12-05", "2026-12-07"], start_date: "2026-12-04" };

describe("expected-delivery rules", () => {
  it("matches a word anywhere in the name, ignoring case; first rule wins", () => {
    expect(dueDaysFor("Wedding ALBUM", rules)).toBe(45);
    expect(dueDaysFor("Highlight Video", rules)).toBe(30);
    expect(dueDaysFor("Album + video combo", rules)).toBe(45);
  });
  it("falls back to Anything else, or no date when that is empty", () => {
    expect(dueDaysFor("Prints", rules)).toBe(20);
    expect(dueDaysFor("Prints", { rules: rules.rules, otherDays: null })).toBe(null);
    expect(dueDaysFor("Album", undefined)).toBe(null);
  });
  it("counts from the event's last day", () => {
    expect(expectedDateFor("Wedding Album", wedding, rules)).toBe("2027-01-21");
    expect(expectedDateFor("Teaser video", wedding, rules)).toBe("2027-01-06");
  });
  it("gives no date for an event without dates", () => {
    expect(expectedDateFor("Album", {}, rules)).toBe(null);
  });
  it("cleans what was saved: blank rows dropped, days clamped", () => {
    const n = normalizeDueRules({ rules: [{ word: " Album ", days: "45" }, { word: "", days: 10 }, { word: "Video", days: "" }, { word: "X", days: 9999 }], otherDays: "-3" });
    expect(n).toEqual({ rules: [{ word: "Album", days: 45 }, { word: "X", days: 365 }], otherDays: null });
  });
});

describe("quotation suggestions", () => {
  const q = [
    { phase_title: INCLUDES_MARK, name: "Wedding Album", quantity: 2 },
    { phase_title: INCLUDES_MARK, name: "Highlight Video", quantity: 1 },
    { phase_title: INCLUDES_MARK, name: " wedding  album ", quantity: 1 },
    { phase_title: "Day 1", day_date: "2026-12-04", name: "Candid Photographer", quantity: 1 },
    { phase_title: INCLUDES_MARK, name: "Prints", quantity: 30000 },
  ];
  it("takes only Includes / Deliverables lines, merging repeated names", () => {
    expect(quotationSuggestions(q, [], [])).toEqual([
      { name: "Wedding Album", quantity: 3 },
      { name: "Highlight Video", quantity: 1 },
      { name: "Prints", quantity: 25000 },
    ]);
  });
  it("skips what is already tracked or was already handled", () => {
    const got = quotationSuggestions(q, [{ title: "highlight video" }], ["PRINTS"]);
    expect(got.map((x) => x.name)).toEqual(["Wedding Album"]);
  });
  it("is empty without a quotation", () => {
    expect(quotationSuggestions(undefined, [], [])).toEqual([]);
  });
});
