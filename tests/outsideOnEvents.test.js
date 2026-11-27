// Events page → Work from others strip: the next jobs from others, soonest first, at most 3, nothing already over.
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
const { upcomingOutsideItems } = await import("../src/lib/outsideWork.js");
const { groupByEvent } = await import("../src/lib/teamWork.js");

vi.useFakeTimers();
vi.setSystemTime(new Date("2026-11-25T10:00:00"));

const it_ = (id, dates, status = "upcoming") => ({ id, type: "team", event_id: id, event_title: id, event_status: status, role_name: "Shooter", working_dates: dates, start_date: dates[0], end_date: dates[dates.length - 1] });
const biz = (name, items) => ({ workspace: { id: name, name }, member: { id: "m" + name }, groups: groupByEvent(items) });

describe("next jobs from others on the Events page", () => {
  const data = [
    biz("Studio Rana", [it_("Past", ["2026-11-20"]), it_("Dec job", ["2026-12-11", "2026-12-12"]), it_("Cancelled", ["2026-11-27"], "cancelled")]),
    biz("Lumen", [it_("Tomorrow job", ["2026-11-26"]), it_("Jan job", ["2027-01-05"]), it_("Feb job", ["2027-02-01"])]),
    biz("Running", [it_("Started yesterday", ["2026-11-24", "2026-11-25", "2026-11-26"])]),
  ];
  it("soonest first, max 3, no past or cancelled jobs", () => {
    const got = upcomingOutsideItems(data, 3);
    expect(got.map((e) => e.title)).toEqual(["Started yesterday", "Tomorrow job", "Dec job"]);
    expect(got.every((e) => e.__outside.business)).toBe(true);
  });
  it("nothing coming up → nothing to show", () => {
    expect(upcomingOutsideItems([biz("Old", [it_("Past", ["2026-10-01"])])])).toEqual([]);
    expect(upcomingOutsideItems(undefined)).toEqual([]);
  });
});
