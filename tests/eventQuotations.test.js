// Several accepted quotations on one event: which ones count, and milestone percentages per quotation.
import { describe, it, expect, vi } from "vitest";
import { latestRevisionsOnly, acceptedQuotationsOfEvent, combinedTotal } from "@/lib/eventQuotations";

const Q = (id, num, extra = {}) => ({ id, quotation_number: num, status: "accepted", grand_total: 100, ...extra });
const fakeBase44 = (rows) => ({ entities: { Quotation: { filter: async () => rows, get: async (id) => rows.find((r) => r.id === id) } } });

describe("which accepted quotations count for an event", () => {
  it("keeps only the newest revision of each quotation", () => {
    const out = latestRevisionsOnly([Q("a", "QT-1"), Q("b", "QT-1-R2"), Q("c", "QT-2"), Q("d", "qt-1-r3")]);
    expect(out.map((q) => q.id).sort()).toEqual(["c", "d"]);
  });

  it("always counts the quotation being synced as itself, even an older revision", async () => {
    const rows = [Q("old", "QT-1"), Q("new", "QT-1-R2"), Q("addon", "QT-2"), Q("draft", "QT-3", { status: "draft" })];
    const group = await acceptedQuotationsOfEvent(fakeBase44(rows), "ws", "e1", rows[0]);
    expect(group.map((q) => q.id)).toEqual(["old", "addon"]);
    const group2 = await acceptedQuotationsOfEvent(fakeBase44(rows), "ws", "e1", rows[1]);
    expect(group2.map((q) => q.id)).toEqual(["new", "addon"]);
    expect(combinedTotal(group2)).toBe(200);
  });

  it("a failing lookup never stops the sync: just the current quotation", async () => {
    const broken = { entities: { Quotation: { filter: async () => { throw new Error("offline"); } } } };
    const group = await acceptedQuotationsOfEvent(broken, "ws", "e1", Q("x", "QT-9"));
    expect(group.map((q) => q.id)).toEqual(["x"]);
  });
});

const rows = [Q("main", "QT-1", { grand_total: 100000 }), Q("addon", "QT-2", { grand_total: 20000 })];
vi.mock("@/api/base44Client", () => ({ base44: { entities: { Quotation: { get: async (id) => rows.find((r) => r.id === id) } } } }));

describe("milestone percentages with several quotations", () => {
  it("each quotation's percent milestones use that quotation's total (no 200%)", async () => {
    const { percentBasesForMilestones } = await import("@/lib/milestoneService");
    const ms = [{ quotation_id: "main" }, { quotation_id: "addon" }, { quotation_id: null }];
    const baseFor = await percentBasesForMilestones(ms, 120000);
    expect(baseFor(ms[0])).toBe(100000);
    expect(baseFor(ms[1])).toBe(20000);
    expect(baseFor(ms[2])).toBe(120000); // a milestone added by hand still uses the full value
  });

  it("one quotation: everything uses the full contract value, exactly as before", async () => {
    const { percentBasesForMilestones } = await import("@/lib/milestoneService");
    const baseFor = await percentBasesForMilestones([{ quotation_id: "main" }, { quotation_id: null }], 130000);
    expect(baseFor({ quotation_id: "main" })).toBe(130000);
  });
});

describe("a revised quotation is still ONE quotation for milestones", () => {
  it("an old revision + its newer revision use the full contract value (not per quotation)", async () => {
    rows.push(Q("r1", "QT-7", { grand_total: 50000, status: "cancelled" }), Q("r2", "QT-7-R2", { grand_total: 60000 }));
    const { percentBasesForMilestones } = await import("@/lib/milestoneService");
    const baseFor = await percentBasesForMilestones([{ quotation_id: "r1" }, { quotation_id: "r2" }], 61000);
    expect(baseFor({ quotation_id: "r2" })).toBe(61000);
    expect(baseFor({ quotation_id: "r1" })).toBe(61000);
  });

  it("a quotation without a number is its own family", async () => {
    const list = [Q("n1", ""), Q("n2", "")];
    const group = await acceptedQuotationsOfEvent(fakeBase44(list), "ws", "e1", list[0]);
    expect(group.map((q) => q.id).sort()).toEqual(["n1", "n2"]);
  });
});
