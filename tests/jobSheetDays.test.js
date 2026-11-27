// Job sheet opened for a team member (?for=): only their days, "See all days" shows the rest; not on any day → all.
import { describe, it, expect } from "vitest";
import { jobSheetDays } from "@/lib/jobSheetDays";

const it3 = [{ date: "2026-12-01" }, { date: "2026-12-02" }, { date: "2026-12-03" }];

describe("job sheet days for a member", () => {
  it("shows only their days, with counts", () => {
    const r = jobSheetDays(it3, ["2026-12-01", "2026-12-03"], false);
    expect(r.days.map((d) => d.date)).toEqual(["2026-12-01", "2026-12-03"]);
    expect([r.hasMine, r.mineCount, r.total]).toEqual([true, 2, 3]);
  });
  it("See all days shows everything, line still there", () => {
    const r = jobSheetDays(it3, ["2026-12-02"], true);
    expect(r.days).toHaveLength(3);
    expect(r.hasMine).toBe(true);
  });
  it("not on any day, or no viewer: all days, no line", () => {
    for (const v of [[], undefined, null, ["2027-01-01"]]) {
      const r = jobSheetDays(it3, v, false);
      expect(r.days).toHaveLength(3);
      expect(r.hasMine).toBe(false);
    }
  });
  it("on every day: all days, no line (the toggle would change nothing)", () => {
    const r = jobSheetDays(it3, it3.map((d) => d.date), false);
    expect([r.days.length, r.hasMine]).toEqual([3, false]);
  });
  it("no itinerary is safe", () => {
    expect(jobSheetDays(undefined, ["x"], false)).toEqual({ days: [], hasMine: false, mineCount: 0, total: 0 });
  });
});
