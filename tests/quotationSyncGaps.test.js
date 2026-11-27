import { describe, it, expect } from "vitest";
import { quotationSyncGaps } from "@/lib/quotationSyncGaps";

const q = (id, name, role, day) => ({ item_type: "team", team_member_id: id, team_member_name_snapshot: name, description: role, day_date: day });
const a = (id, role, dates) => ({ team_member_id: id, role_name_snapshot: role, working_dates: dates, assignment_status: "assigned" });

describe("quotationSyncGaps replacements", () => {
  it("reports a same-role, same-dates swap as a replacement", () => {
    const g = quotationSyncGaps([q("A", "Asha", "Photographer", "2026-11-04")], [a("B", "Photographer", ["2026-11-04"])], [], { memberName: () => "Bina" });
    expect(g.members).toEqual([]);
    expect(g.replacements).toEqual([{ fromId: "A", fromName: "Asha", toId: "B", toName: "Bina", role: "Photographer" }]);
    expect(g.total).toBe(1);
  });
  it("keeps a different-role person as a plain missing member", () => {
    const g = quotationSyncGaps([q("A", "Asha", "Photographer", "2026-11-04")], [a("B", "Videographer", ["2026-11-04"])], []);
    expect(g.members).toEqual(["Asha"]);
    expect(g.replacements).toEqual([]);
  });
  it("keeps different dates as a plain missing member", () => {
    const g = quotationSyncGaps([q("A", "Asha", "Photographer", "2026-11-04")], [a("B", "Photographer", ["2026-11-05"])], []);
    expect(g.members).toEqual(["Asha"]);
  });
});

describe("filledRoleSuggestions (role quoted without a person, filled on the event)", () => {
  it("suggests the person added on the event for the same role and dates, and applies only to those lines", async () => {
    const { filledRoleSuggestions, applyFilledRoleToQuotation } = await import("@/lib/quotationSyncGaps");
    const items = [
      { id: "l1", item_type: "team", team_member_id: null, description: "Reg Photographer", name: "Reg Photographer", day_date: "2027-01-19", _quoteNumber: "QT-0025" },
      { id: "l2", item_type: "team", team_member_id: null, description: "Reg Photographer", name: "Reg Photographer", day_date: "2027-01-22", _quoteNumber: "QT-0025" },
      { id: "l3", item_type: "role", name: "Candid Photographer", day_date: "2027-01-13", _quoteNumber: "QT-0026-R2" }, // package-style role line
      { id: "l4", item_type: "team", team_member_id: "m9", team_member_name_snapshot: "Already quoted", description: "Reg Photographer", day_date: "2027-01-19" },
    ];
    const asg = [
      { id: "a1", team_member_id: "jeet", role_name_snapshot: "Reg Photographer", working_dates: ["2027-01-19"], assignment_status: "assigned" },
      { id: "a2", team_member_id: "kiran", role_name_snapshot: "Candid Photographer & Reg Photographer", working_dates: ["2027-01-13"], assignment_status: "assigned" },
      { id: "a3", team_member_id: "gone", role_name_snapshot: "Reg Photographer", working_dates: ["2027-01-22"], assignment_status: "removed" },
    ];
    const names = { jeet: "Jeet", kiran: "Kiran" };
    const out = filledRoleSuggestions(items, asg, { memberName: (id) => names[id] });
    expect(out.map((x) => [x.memberName, x.role, x.lineIds, x.dates, x.quotes])).toEqual([
      ["Jeet", "Reg Photographer", ["l1"], ["2027-01-19"], ["QT-0025"]],
      ["Kiran", "Candid Photographer", ["l3"], ["2027-01-13"], ["QT-0026-R2"]],
    ]); // 22 Jan stays open (only a removed assignment), l4 already has a person

    const updates = [];
    const fake = { entities: { QuotationItem: { update: async (id, data) => { updates.push([id, data]); } } } };
    await applyFilledRoleToQuotation(fake, out[1], { id: "kiran", name: "Kiran" });
    expect(updates).toEqual([["l3", { item_type: "team", team_member_id: "kiran", reference_id: "kiran", team_member_name_snapshot: "Kiran", name: "Kiran", description: "Candid Photographer" }]]);
  });

  it("never puts one person on two lines of the same date, and needs an exact role", async () => {
    const { filledRoleSuggestions } = await import("@/lib/quotationSyncGaps");
    const items = [
      { id: "l1", item_type: "team", team_member_id: null, description: "Reg Photographer", day_date: "2027-01-19" },
      { id: "l2", item_type: "team", team_member_id: null, description: "Reg Photographer", day_date: "2027-01-19" },
      { id: "l3", item_type: "team", team_member_id: null, description: "Drone Operator", day_date: "2027-01-19" },
    ];
    const asg = [{ id: "a1", team_member_id: "jeet", role_name_snapshot: "Reg Photographer", working_dates: ["2027-01-19"], assignment_status: "assigned" }];
    const out = filledRoleSuggestions(items, asg, { memberName: () => "Jeet" });
    expect(out).toHaveLength(1);
    expect(out[0].lineIds).toEqual(["l1"]);
  });
});
