import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory stand-in for the database: every entity is a list of rows.
const store = {};
let seq = 0;
const table = (name) => (store[name] ||= []);
const match = (row, q = {}) => Object.entries(q).every(([k, v]) => row[k] === v);
const entity = (name) => ({
  get: async (id) => table(name).find((r) => r.id === id) || null,
  filter: async (q) => table(name).filter((r) => match(r, q)),
  create: async (data) => { const row = { id: `${name}-${++seq}`, ...data }; table(name).push(row); return row; },
  update: async (id, data) => { const row = table(name).find((r) => r.id === id); Object.assign(row, data); return row; },
});
vi.mock("@/api/base44Client", () => ({
  base44: { entities: new Proxy({}, { get: (_, name) => entity(String(name)) }) },
}));
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/invoiceService", () => ({ deriveInvoiceStatus: () => "unpaid" }));
vi.mock("@/lib/clientPortalAccess", () => ({ buildPasswordUpdate: async () => ({}), CLEARED_PORTAL_FIELDS: {} }));

import { syncQuotationAcceptance } from "@/lib/clientEdgeFunctions";

const WS = "ws1";
const teamLine = (member, role, day, total) => ({ workspace_id: WS, quotation_id: "q1", item_type: "team", team_member_id: member, description: role, day_date: day, line_total: total, member_type: "" });

function seed({ items, quotation = {} }) {
  for (const k of Object.keys(store)) delete store[k];
  table("Quotation").push({
    id: "q1", workspace_id: WS, status: "accepted", quotation_number: "QT-1", client_id: "c1",
    client_snapshot: JSON.stringify({ name: "Tanvi & Chinmay" }),
    start_date: "2026-12-09", end_date: "2026-12-12", excluded_dates: [],
    grand_total: 265000, payment_schedule_json: "[]", ...quotation,
  });
  items.forEach((it, i) => table("QuotationItem").push({ id: `i${i}`, sort_order: i, ...it }));
  table("TeamRole").push({ id: "r1", workspace_id: WS, name: "Reg Photographer" }, { id: "r2", workspace_id: WS, name: "Hybrid Photographer" });
}

describe("syncQuotationAcceptance", () => {
  beforeEach(() => { seq = 0; });

  it("copies the selected days (range minus excluded) onto the event", async () => {
    seed({ items: [], quotation: { start_date: "2026-12-09", end_date: "2026-12-12", excluded_dates: ["2026-12-09"] } });
    const res = await syncQuotationAcceptance(WS, "q1");
    expect(res.ok).toBe(true);
    const ev = table("Event")[0];
    expect(ev.event_dates).toEqual(["2026-12-10", "2026-12-11", "2026-12-12"]);
    expect(ev.start_date).toBe("2026-12-10");
    expect(ev.end_date).toBe("2026-12-12");
  });

  it("gives one person with two roles ONE assignment with both roles, summed rate, merged days", async () => {
    seed({ items: [
      teamLine("m1", "Reg Photographer", "2026-12-09", 10000),
      teamLine("m1", "Hybrid Photographer", "2026-12-10", 20000),
    ] });
    const res = await syncQuotationAcceptance(WS, "q1");
    const asg = table("EventTeamAssignment");
    expect(asg).toHaveLength(1);
    expect(asg[0].role_name_snapshot).toBe("Reg Photographer & Hybrid Photographer");
    expect(asg[0].agreed_rate).toBe(30000);
    expect(asg[0].working_dates).toEqual(["2026-12-09", "2026-12-10"]);
    expect(res.team_synced).toHaveLength(1);
  });

  it("creates no assignment for a role quoted without a person", async () => {
    seed({ items: [teamLine(null, "Drone Operator", "2026-12-10", 5000), teamLine("m1", "Reg Photographer", "2026-12-10", 10000)] });
    const res = await syncQuotationAcceptance(WS, "q1");
    expect(table("EventTeamAssignment")).toHaveLength(1);
    expect(res.team_synced).toHaveLength(1);
  });

  it("returns real counts and says whether the event was created", async () => {
    seed({
      items: [teamLine("m1", "Reg Photographer", "2026-12-09", 10000), { workspace_id: WS, quotation_id: "q1", item_type: "service", reference_id: "s1", name: "Drone", line_total: 4000 }],
      quotation: { payment_schedule_json: JSON.stringify([{ name: "Advance", type: "percent", value: 50, due_date_type: "on_signing" }]) },
    });
    const res = await syncQuotationAcceptance(WS, "q1");
    expect(res.event.created).toBe(true);
    expect(res.team_synced).toHaveLength(1);
    expect(res.service_synced).toHaveLength(1);
    expect(res.milestones_synced).toHaveLength(1);
  });

  it("re-sync updates the same event: no duplicates, title and own details kept", async () => {
    seed({ items: [teamLine("m1", "Reg Photographer", "2026-12-09", 10000)] });
    await syncQuotationAcceptance(WS, "q1");
    const ev = table("Event")[0];
    ev.title = "My own title"; ev.venue = "GCC";
    table("Quotation")[0].excluded_dates = ["2026-12-09"]; // dates changed on the quotation afterwards
    const res = await syncQuotationAcceptance(WS, "q1");
    expect(table("Event")).toHaveLength(1);
    expect(table("EventTeamAssignment")).toHaveLength(1);
    expect(res.event.created).toBe(false);
    expect(ev.title).toBe("My own title");
    expect(ev.venue).toBe("GCC");
    expect(ev.event_dates).toEqual(["2026-12-10", "2026-12-11", "2026-12-12"]);
  });

  it("refuses a quotation that isn't accepted", async () => {
    seed({ items: [], quotation: { status: "finalized" } });
    await expect(syncQuotationAcceptance(WS, "q1")).rejects.toBeTruthy();
  });
});
