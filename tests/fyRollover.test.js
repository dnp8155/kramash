import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/api/base44Client", () => ({ base44: { entities: {} } }));

import { fyRolloverState, nextFYAfter } from "@/lib/financialYearService";
import { setFyStartMonth } from "@/lib/dates";
import { daySchedServices } from "@/lib/daySchedule";

const fy = (over = {}) => ({
  id: "a", fy_id: "FY2026-27", start_date: "2026-04-01", end_date: "2027-03-31", is_active: true, ...over,
});

afterEach(() => setFyStartMonth(4));

describe("year-end rollover", () => {
  it("describes the FY after the active one", () => {
    expect(nextFYAfter(fy())).toMatchObject({ fyId: "FY2027-28", start: "2027-04-01", end: "2028-03-31" });
  });

  it("stays quiet until the last 30 days", () => {
    expect(fyRolloverState([fy()], "2027-02-01")).toBeNull();
  });

  it("asks to create the next year in the last 30 days", () => {
    const s = fyRolloverState([fy()], "2027-03-10");
    expect(s).toMatchObject({ kind: "create", daysLeft: 21, ended: false });
    expect(s.next.fyId).toBe("FY2027-28");
  });

  it("keeps asking after the year has ended", () => {
    expect(fyRolloverState([fy()], "2027-04-02")).toMatchObject({ kind: "create", ended: true });
  });

  it("does nothing when the next year already exists and the current one is still running", () => {
    const next = fy({ id: "b", fy_id: "FY2027-28", start_date: "2027-04-01", end_date: "2028-03-31", is_active: false });
    expect(fyRolloverState([fy(), next], "2027-03-10")).toBeNull();
  });

  it("offers to activate an existing next year once the old one ended", () => {
    const next = fy({ id: "b", fy_id: "FY2027-28", start_date: "2027-04-01", end_date: "2028-03-31", is_active: false });
    expect(fyRolloverState([fy(), next], "2027-04-02")).toMatchObject({ kind: "activate", existing: { id: "b" } });
  });

  it("follows a custom start month", () => {
    setFyStartMonth(1);
    const cal = fy({ fy_id: "FY2026-27", start_date: "2026-01-01", end_date: "2026-12-31" });
    expect(nextFYAfter(cal)).toMatchObject({ start: "2027-01-01", end: "2027-12-31" });
  });

  it("offers to activate today's year when none is active", () => {
    expect(fyRolloverState([fy({ is_active: false })], "2027-03-10")).toMatchObject({ kind: "activate" });
  });

  it("does nothing without any year on record", () => {
    expect(fyRolloverState([], "2027-03-10")).toBeNull();
  });
});


describe("rollover after long gaps", () => {
  it("offers the year that contains today, not the one after the last", () => {
    const old = fy({ fy_id: "FY2023-24", start_date: "2023-04-01", end_date: "2024-03-31" });
    const s = fyRolloverState([old], "2026-10-13");
    expect(s).toMatchObject({ kind: "create", ended: true });
    expect(s.next).toMatchObject({ fyId: "FY2026-27", start: "2026-04-01", end: "2027-03-31" });
  });

  it("offers the year before the new start month when today falls in the earlier one", () => {
    const old = fy({ fy_id: "FY2023-24", start_date: "2023-04-01", end_date: "2024-03-31" });
    expect(fyRolloverState([old], "2026-02-10").next.fyId).toBe("FY2025-26");
  });

  it("activates today's year when it exists but the active one is over", () => {
    const old = fy({ fy_id: "FY2024-25", start_date: "2024-04-01", end_date: "2025-03-31" });
    const cur = fy({ id: "c", is_active: false });
    expect(fyRolloverState([old, cur], "2026-10-13")).toMatchObject({ kind: "activate", existing: { id: "c" } });
  });

  it("leaves an active year the owner chose deliberately alone", () => {
    const future = fy({ id: "f", fy_id: "FY2027-28", start_date: "2027-04-01", end_date: "2028-03-31", is_active: true });
    const cur = fy({ id: "c", is_active: false });
    expect(fyRolloverState([cur, future], "2026-10-13")).toBeNull();
  });
});

describe("schedule day services follow the event", () => {
  const assigns = [
    { service_id: "s1", service_name_snapshot: "Photo", assignment_status: "assigned" },
    { service_id: "s2", service_name_snapshot: "Album", assignment_status: "assigned", is_addon: true },
    { service_id: "s3", service_name_snapshot: "Gone", assignment_status: "removed" },
  ];

  it("shows every live service and add-on by default", () => {
    const r = daySchedServices(assigns, [], []);
    expect(r.shown.map((x) => x.id)).toEqual(["s1", "s2"]);
    expect(r.shown[1].isAddon).toBe(true);
    expect(r.isCustom).toBe(false);
  });

  it("shows only the picked services when the day is customised", () => {
    const r = daySchedServices(assigns, [], ["s1"]);
    expect(r.shown.map((x) => x.id)).toEqual(["s1"]);
    expect(r.isCustom).toBe(true);
  });

  it("falls back to the event list when picked services were removed", () => {
    const r = daySchedServices(assigns, [], ["s3", "zzz"]);
    expect(r.shown.map((x) => x.id)).toEqual(["s1", "s2"]);
    expect(r.isCustom).toBe(false);
  });

  it("picks up a service added to the event later", () => {
    const more = [...assigns, { service_id: "s4", service_name_snapshot: "Video", assignment_status: "assigned" }];
    expect(daySchedServices(more, [], []).shown.map((x) => x.id)).toEqual(["s1", "s2", "s4"]);
  });
});
