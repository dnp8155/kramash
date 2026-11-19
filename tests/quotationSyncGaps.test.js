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
