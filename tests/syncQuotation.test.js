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

// Two accepted quotations on ONE event (e.g. main + add-on): syncing either keeps both.
describe("syncQuotationAcceptance with several accepted quotations on one event", () => {
  beforeEach(() => { seq = 0; });

  function seedTwo() {
    for (const k of Object.keys(store)) delete store[k];
    table("Event").push({ id: "e1", workspace_id: WS, title: "Tanvi & Chinmay", event_dates: [], status: "upcoming" });
    table("Quotation").push(
      { id: "qa", workspace_id: WS, status: "accepted", quotation_number: "QT-0025", event_id: "e1", client_id: "c1",
        start_date: "2027-01-19", end_date: "2027-01-22", excluded_dates: ["2027-01-21"], grand_total: 100000, payment_schedule_json: "[]" },
      { id: "qb", workspace_id: WS, status: "accepted", quotation_number: "QT-0026-R2", event_id: "e1", client_id: "c1",
        start_date: "2027-01-13", end_date: "2027-01-13", excluded_dates: [], grand_total: 40000, payment_schedule_json: "[]" },
      // an older revision that was replaced: never counted
      { id: "qold", workspace_id: WS, status: "accepted", quotation_number: "QT-0026", event_id: "e1", client_id: "c1",
        start_date: "2027-02-01", end_date: "2027-02-01", excluded_dates: [], grand_total: 999999, payment_schedule_json: "[]" },
    );
    const line = (q, member, role, day, total) => ({ workspace_id: WS, quotation_id: q, item_type: "team", team_member_id: member, description: role, day_date: day, line_total: total, member_type: "" });
    [line("qa", "kiran", "Candid Photographer", "2027-01-19", 9000), line("qa", "kiran", "Candid Photographer", "2027-01-20", 9000),
     line("qb", "kiran", "Candid Photographer", "2027-01-13", 7000),
     { workspace_id: WS, quotation_id: "qa", item_type: "service", reference_id: "s1", name: "Drone", line_total: 4000 },
     { workspace_id: WS, quotation_id: "qb", item_type: "service", reference_id: "s1", name: "Drone", line_total: 3000 }]
      .forEach((it, i) => table("QuotationItem").push({ id: `x${i}`, sort_order: i, ...it }));
  }

  for (const which of ["qa", "qb"]) {
    it(`syncing ${which} keeps the dates, total, team and services of both`, async () => {
      seedTwo();
      await syncQuotationAcceptance(WS, which);
      const ev = table("Event")[0];
      expect(ev.event_dates).toEqual(["2027-01-13", "2027-01-19", "2027-01-20", "2027-01-22"]);
      expect(ev.start_date).toBe("2027-01-13");
      expect(ev.end_date).toBe("2027-01-22");
      expect(ev.contract_value).toBe(140000); // 100000 + 40000, the replaced revision not counted
      const asg = table("EventTeamAssignment");
      expect(asg).toHaveLength(1);
      expect(asg[0].working_dates).toEqual(["2027-01-13", "2027-01-19", "2027-01-20"]);
      expect(asg[0].agreed_rate).toBe(25000);
      expect(table("EventServiceAssignment")[0].agreed_rate).toBe(7000);
    });
  }

  it("re-syncing again gives the same result (nothing doubles)", async () => {
    seedTwo();
    await syncQuotationAcceptance(WS, "qa");
    await syncQuotationAcceptance(WS, "qb");
    await syncQuotationAcceptance(WS, "qa");
    expect(table("EventTeamAssignment")).toHaveLength(1);
    expect(table("EventTeamAssignment")[0].agreed_rate).toBe(25000);
    expect(table("Event")[0].contract_value).toBe(140000);
  });
});

describe("syncing a revision takes over its older revision's milestones", () => {
  it("re-points the old milestones (payments stay linked) instead of adding a second schedule", async () => {
    for (const k of Object.keys(store)) delete store[k];
    table("Event").push({ id: "e1", workspace_id: WS, title: "T", event_dates: [], status: "upcoming" });
    const schedule = JSON.stringify([{ name: "Advance", type: "percent", value: 50, due_date_type: "on_signing" }, { name: "Final", type: "percent", value: 50, due_date_type: "event_day" }]);
    table("Quotation").push(
      { id: "old", workspace_id: WS, status: "cancelled", quotation_number: "QT-5", event_id: "e1", start_date: "2027-01-10", end_date: "2027-01-10", excluded_dates: [], grand_total: 100000, payment_schedule_json: schedule },
      { id: "new", workspace_id: WS, status: "accepted", quotation_number: "QT-5-R2", event_id: "e1", start_date: "2027-01-10", end_date: "2027-01-10", excluded_dates: [], grand_total: 120000, payment_schedule_json: schedule },
    );
    table("PaymentMilestone").push(
      { id: "m1", workspace_id: WS, event_id: "e1", quotation_id: "old", name: "Advance", paid_amount: 50000 },
      { id: "m2", workspace_id: WS, event_id: "e1", quotation_id: "old", name: "Final", paid_amount: 0 },
    );
    await syncQuotationAcceptance(WS, "new");
    const ms = table("PaymentMilestone");
    expect(ms).toHaveLength(2); // no second schedule
    expect(ms.every((m) => m.quotation_id === "new")).toBe(true);
    expect(ms.find((m) => m.id === "m1")).toMatchObject({ due_amount: 60000, paid_amount: 50000 }); // same milestone, payment kept
  });
});
