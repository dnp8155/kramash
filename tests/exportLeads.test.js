import { describe, it, expect, vi, beforeEach } from "vitest";

const written = [];
vi.mock("xlsx", async (orig) => {
  const real = await orig();
  const api = { ...real, writeFile: (wb, name) => { written.push({ wb, name }); } };
  return { ...api, default: api };
});
vi.mock("@/lib/financeService", () => ({ eventFinancialSummary: () => ({}), assignmentPaid: () => 0, serviceAssignmentPaid: () => 0, teamPaymentStatus: () => "" }));

import * as XLSX from "xlsx";
import { exportLeadsXlsx } from "@/lib/exportUtils";

beforeEach(() => { written.length = 0; });

const leads = [
  { id: "1", name: "Priya Shah", phone: "9876543210", source: "referral", event_type: "Wedding", event_dates: ["2026-12-03", "2026-12-01"], budget: 250000, status: "negotiation", priority: "hot", next_followup_date: "2026-10-15", last_contacted_at: "2026-10-10T08:30:00Z", created_at: "2026-10-01T05:00:00Z", notes: "Likes candid shots" },
  { id: "2", name: "Raj Mehta", source: "social_media", event_date: "2026-11-20", status: "lost", lost_reason: "price", priority: "cold", created_at: "2026-09-20T05:00:00Z" },
  { id: "3", name: "Meera", status: "won", converted_event_id: "e1", created_at: "2026-09-01T05:00:00Z" },
];
const activities = [
  { id: "a1", lead_id: "2", kind: "status", from_status: "new", to_status: "lost", body: "reason:price · too costly", created_at: "2026-10-05T10:00:00Z" },
  { id: "a2", lead_id: "1", kind: "call", created_at: "2026-10-02T09:00:00Z" },
  { id: "a3", lead_id: "1", kind: "note", body: "Wants a pre-wedding shoot too", created_at: "2026-10-03T09:00:00Z" },
  { id: "a4", lead_id: "999", kind: "note", body: "belongs to a lead that is not exported", created_at: "2026-10-03T09:00:00Z" },
];

describe("exportLeadsXlsx", () => {
  it("has the new columns: all event dates, last contacted, lost reason, converted, added on", () => {
    exportLeadsXlsx(leads);
    const rows = XLSX.utils.sheet_to_json(written[0].wb.Sheets.Leads);
    const priya = rows.find((r) => r["Lead Name"] === "Priya Shah");
    expect(priya["Event Date(s)"]).toBe("2026-12-01, 2026-12-03");
    expect(priya["Status"]).toBe("Negotiation");
    expect(priya["Priority"]).toBe("Hot");
    expect(priya["Source"]).toBe("Referral");
    expect(priya["Next Follow-up"]).toBe("2026-10-15");
    expect(priya["Last Contacted"]).toMatch(/^2026-10-10 \d\d:\d\d$/);
    expect(priya["Converted"]).toBe("No");
    expect(priya["Added On"]).toBe("2026-10-01");
    const raj = rows.find((r) => r["Lead Name"] === "Raj Mehta");
    expect(raj["Event Date(s)"]).toBe("2026-11-20");
    expect(raj["Lost Reason"]).toBe("Price too high");
    expect(rows.find((r) => r["Lead Name"] === "Meera")["Converted"]).toBe("Yes");
    // only lost leads show a reason
    expect(priya["Lost Reason"]).toBe("");
  });

  it("adds a History sheet for the exported leads only, grouped by lead and oldest first", () => {
    exportLeadsXlsx(leads, activities);
    const wb = written[0].wb;
    expect(wb.SheetNames).toEqual(["Leads", "History"]);
    const hist = XLSX.utils.sheet_to_json(wb.Sheets.History);
    expect(hist.map((h) => h["Lead Name"])).toEqual(["Priya Shah", "Priya Shah", "Raj Mehta"]);
    expect(hist[0]["Type"]).toBe("Call");
    expect(hist[0]["Details"]).toBe("Called");
    expect(hist[1]["Details"]).toBe("Wants a pre-wedding shoot too");
    expect(hist[2]["Type"]).toBe("Status change");
    expect(hist[2]["Details"]).toBe("New → Lost · Price too high · too costly");
  });

  it("skips the History sheet when there is no history", () => {
    exportLeadsXlsx(leads, []);
    expect(written[0].wb.SheetNames).toEqual(["Leads"]);
  });
});
