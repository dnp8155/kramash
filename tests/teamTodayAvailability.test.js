// Dashboard → Team Today and the Team availability calendar: who is booked on a given day.
import { describe, it, expect, vi } from "vitest";
vi.mock("@/api/base44Client", () => ({ base44: { entities: {} } }));
const { splitAvailability, isBookedOnDate } = await import("../src/lib/teamService.js");

const ev = { id: "e1", status: "upcoming", start_date: "2026-11-02", end_date: "2026-12-28", event_dates: ["2026-11-02", "2026-12-28"] };
const eventsById = { e1: ev };
const asha = { id: "m1", name: "Asha", status: "active" };
const ravi = { id: "m2", name: "Ravi", status: "active" };

describe("booked only on the days they were booked", () => {
  // Saved by the app for picked days: working_dates plus a first→last range.
  const picked = { team_member_id: "m1", event_id: "e1", assignment_status: "assigned", working_dates: ["2026-11-02", "2026-12-28"], booking_start_date: "2026-11-02", booking_end_date: "2026-12-28" };

  it("picked days: not booked on the days in between (was always 'Booked')", () => {
    const today = splitAvailability([asha, ravi], "2026-11-25", [picked], eventsById, []);
    expect(today.booked).toHaveLength(0);
    expect(today.available.map((m) => m.name)).toEqual(["Asha", "Ravi"]);
  });
  it("picked days: booked on a picked day", () => {
    const day = splitAvailability([asha, ravi], "2026-12-28", [picked], eventsById, []);
    expect(day.booked.map((b) => b.member.name)).toEqual(["Asha"]);
  });
  it("dates saved with a time still match the day", () => {
    expect(isBookedOnDate({ working_dates: ["2026-11-02T00:00:00"] }, ev, "2026-11-02")).toBe(true);
  });
  it("a plain range booking still covers every day in it", () => {
    const range = { team_member_id: "m2", event_id: "e1", assignment_status: "assigned", working_dates: [], booking_start_date: "2026-11-20", booking_end_date: "2026-11-26" };
    expect(splitAvailability([ravi], "2026-11-25", [range], eventsById, []).booked).toHaveLength(1);
    expect(splitAvailability([ravi], "2026-11-27", [range], eventsById, []).booked).toHaveLength(0);
  });
  it("removed bookings and cancelled events never count", () => {
    expect(splitAvailability([asha], "2026-11-02", [{ ...picked, assignment_status: "removed" }], eventsById, []).booked).toHaveLength(0);
    expect(splitAvailability([asha], "2026-11-02", [picked], { e1: { ...ev, status: "cancelled" } }, []).booked).toHaveLength(0);
  });
});
