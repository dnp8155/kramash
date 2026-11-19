import { describe, it, expect } from "vitest";
import { openRoleSlots } from "@/lib/openRoleSlots";

const roleOnly = (role, day) => ({ item_type: "team", description: role, day_date: day, team_member_id: null, team_member_name_snapshot: "" });
const withPerson = (role, day, id) => ({ item_type: "team", description: role, day_date: day, team_member_id: id, team_member_name_snapshot: "Amit" });

describe("openRoleSlots (roles quoted without a person)", () => {
  it("shows one card for a role nobody fills, with its dates", () => {
    const slots = openRoleSlots([roleOnly("Drone Operator", "2026-12-10"), roleOnly("Drone Operator", "2026-12-12")], []);
    expect(slots).toHaveLength(1);
    expect(slots[0].role).toBe("Drone Operator");
    expect(slots[0].dates).toEqual(["2026-12-10", "2026-12-12"]);
  });
  it("shows nothing once a person is assigned to that role", () => {
    const slots = openRoleSlots([roleOnly("Drone Operator", "2026-12-10")], [{ role_name_snapshot: "Drone Operator" }]);
    expect(slots).toEqual([]);
  });
  it("matches a role inside a combined 'X & Y' assignment", () => {
    const slots = openRoleSlots([roleOnly("Candid Photographer", "2026-12-10")], [{ role_name_snapshot: "Reg Photographer & Candid Photographer" }]);
    expect(slots).toEqual([]);
  });
  it("two people needed, one assigned → one card left", () => {
    const items = [roleOnly("Cinematographer", "2026-12-10"), roleOnly("Cinematographer", "2026-12-10")];
    expect(openRoleSlots(items, [{ role_name_snapshot: "Cinematographer" }])).toHaveLength(1);
  });
  it("ignores lines that already have a person", () => {
    expect(openRoleSlots([withPerson("Reg Photographer", "2026-12-10", "m1")], [])).toEqual([]);
  });
  it("a role quoted on 3 dates and filled on 2 still shows the 3rd date", () => {
    const items = ["2026-12-10", "2026-12-11", "2026-12-12"].map((d) => roleOnly("Cinematographer", d));
    const slots = openRoleSlots(items, [{ id: "a1", role_name_snapshot: "Cinematographer", working_dates: ["2026-12-10", "2026-12-11"] }]);
    expect(slots).toHaveLength(1);
    expect(slots[0].dates).toEqual(["2026-12-12"]);
  });
  it("a package role line (item_type \"role\") counts as an open role", () => {
    const slots = openRoleSlots([{ item_type: "role", name: "Drone Operator", description: "", day_date: "2026-12-10" }], []);
    expect(slots).toHaveLength(1);
    expect(slots[0].role).toBe("Drone Operator");
  });
  it("lines from several accepted quotations are all counted, with their numbers", () => {
    const items = [{ ...roleOnly("Cinematographer", "2026-12-10"), _quoteNumber: "QT-1" }, { ...roleOnly("Drone Operator", "2026-12-11"), _quoteNumber: "QT-2" }];
    const slots = openRoleSlots(items, []);
    expect(slots.map((s) => [s.role, s.quotes])).toEqual([["Cinematographer", ["QT-1"]], ["Drone Operator", ["QT-2"]]]);
  });
  it("removed assignments do not fill a role", () => {
    const slots = openRoleSlots([roleOnly("Cinematographer", "2026-12-10")], [{ role_name_snapshot: "Cinematographer", assignment_status: "removed" }]);
    expect(slots).toHaveLength(1);
  });
});
