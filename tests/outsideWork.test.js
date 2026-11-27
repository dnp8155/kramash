import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: vi.fn() } }));
import { assembleTeamPortalData } from "@/lib/teamPortalAccess";
import { groupByEvent } from "@/lib/teamWork";
import { outsideCalendarItems, outsideBookedDays } from "@/lib/outsideWork";

const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// One business's Team Portal payload, the shape get_my_outside_work returns per business.
const payload = {
  member: { id: "m1", name: "Ujjawal" },
  workspace: { id: "ws_k", name: "Krishna Shah Photography", currency: "INR" },
  events: [
    { id: "e1", title: "Wedding T&C", start_date: plus(10), end_date: plus(30), venue: "GCC Club", status: "upcoming" },
    { id: "e2", title: "Old shoot", start_date: plus(-20), end_date: plus(-20), venue: "", status: "completed" },
  ],
  team_assignments: [
    { id: "a1", event_id: "e1", role_name: "Cinematographer", agreed_rate: 26000, working_dates: [plus(10), plus(11), plus(12)] },
    { id: "a2", event_id: "e2", role_name: "Photographer", agreed_rate: 5000, working_dates: [plus(-20)] },
  ],
  service_assignments: [{ id: "s1", event_id: "e1", role_name: "Wedding Film", agreed_rate: 10000 }],
  job_sheets: [], transactions: [], summary: { totalEarnings: 41000, totalPaid: 0, remaining: 41000 },
};

const business = () => {
  const d = assembleTeamPortalData(payload);
  return [{ ...d, groups: groupByEvent([...(d.upcoming || []), ...(d.past || [])]) }];
};

describe("Work from others", () => {
  it("calendar shows the member's own days only, with the business name", () => {
    const items = outsideCalendarItems(business());
    const wedding = items.find((i) => i.title === "Wedding T&C");
    expect(wedding.event_dates).toEqual([plus(10), plus(11), plus(12)]); // not the whole event span, not the service's day
    expect(wedding.__outside.business).toBe("Krishna Shah Photography");
    expect(wedding.__outside.roles).toEqual(expect.arrayContaining(["Cinematographer", "Wedding Film"]));
    expect(wedding.id).toMatch(/^outside:/); // never clashes with the member's own event ids
  });
  it("past bookings stay on the calendar as done", () => {
    const old = outsideCalendarItems(business()).find((i) => i.title === "Old shoot");
    expect(old.status).toBe("completed");
  });
  it("clash days are only upcoming booked days", () => {
    const days = outsideBookedDays(business());
    expect(Object.keys(days).sort()).toEqual([plus(10), plus(11), plus(12)]);
    expect(days[plus(11)][0]).toMatchObject({ business: "Krishna Shah Photography", title: "Wedding T&C" });
  });
});
