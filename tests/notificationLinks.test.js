// Every notification opens the thing it is about (bell). Push links are set on the server to the same places.
import { describe, it, expect, vi } from "vitest";

const rows = { PaymentMilestone: { ms1: { id: "ms1", event_id: "ev9" }, ms2: { id: "ms2", event_id: null } }, JobSheet: { js1: { id: "js1", event_id: "ev7" } } };
vi.mock("@/api/base44Client", () => ({
  base44: { entities: new Proxy({}, { get: (_, name) => ({ get: async (id) => { const r = rows[name]?.[id]; if (!r) throw new Error("not found"); return r; } }) }) },
}));

const { notificationPath, resolveNotificationPath } = await import("../src/lib/notificationLinks.js");
const n = (related_entity_type, related_entity_id, title = "Something") => ({ related_entity_type, related_entity_id, title });

describe("tapping a notification opens its item", () => {
  it.each([
    [n("event", "e1"), "/events/e1"],
    [n("events", "e1", "Event created"), "/events/e1"],
    [n("clients", "c1"), "/clients/c1"],
    [n("leads", "l1"), "/leads?lead=l1"],
    [n("quotation", "q1"), "/quotation/q1"],
    [n("quotations", "q1"), "/quotation/q1"],
    [n("invoices", "i1"), "/invoices/i1"],
    [n("team_members", "t1"), "/team/t1"],
    [n("subscription", "s1"), "/plan"],
    [n("outside_work", "x1"), "/outside-work"],
    [n("support_ticket", "12"), "/help?tab=tickets"],
    [n("services", "sv1"), "/rate-estimator"],
    [n("financial_transactions", "f1"), "/financial"],
    [n("team_block_dates", "b1"), "/team"],
  ])("%o → %s", (note, path) => expect(notificationPath(note)).toBe(path));

  it("a deleted item opens its list, not a missing page", () => {
    expect(notificationPath(n("events", "e1", "Event deleted"))).toBe("/events");
    expect(notificationPath(n("clients", "c1", "Client deleted"))).toBe("/clients");
  });
  it("unknown or empty types still go somewhere", () => {
    expect(notificationPath(n("something_new", "z"))).toBe("/dashboard");
    expect(notificationPath({ type: "event_reminder" })).toBe("/events");
    expect(notificationPath({})).toBe("/dashboard");
  });
  it("a payment due opens its event's Milestones tab", async () => {
    expect(await resolveNotificationPath(n("milestone", "ms1"))).toBe("/events/ev9?tab=Milestones");
    expect(await resolveNotificationPath(n("milestone", "ms2"))).toBe("/financial"); // milestone not tied to an event
    expect(await resolveNotificationPath(n("milestone", "gone"))).toBe("/financial");
  });
  it("a job sheet opens its event's job sheet", async () => {
    expect(await resolveNotificationPath(n("job_sheets", "js1"))).toBe("/events/ev7/job-sheet");
  });
});
