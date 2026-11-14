import { describe, it, expect } from "vitest";
import { allocateEventReceipts } from "@/lib/invoiceAllocation";

const inv = (id, total, extra = {}) => ({ id, grand_total: total, status: "sent", invoice_date: "2026-11-01", ...extra });
const rc = (amount, extra = {}) => ({ amount, invoice_id: null, milestone_id: null, ...extra });
const paid = (plan, id) => plan.find((p) => p.id === id)?.amount_paid;

describe("client payments count towards the event's invoices", () => {
  it("a full payment entered on the event marks the invoice paid in full", () => {
    expect(allocateEventReceipts([inv("a", 100000)], [rc(100000)])).toEqual([{ id: "a", amount_paid: 100000 }]);
  });
  it("a part payment counts as part paid, and nothing paid stays at zero", () => {
    expect(paid(allocateEventReceipts([inv("a", 100000)], [rc(30000), rc(20000)]), "a")).toBe(50000);
    expect(paid(allocateEventReceipts([inv("a", 100000)], []), "a")).toBe(0);
  });
  it("payments entered on the invoice count for it, and event payments only fill what is still owed", () => {
    const plan = allocateEventReceipts([inv("a", 100000)], [rc(60000, { invoice_id: "a" }), rc(70000)]);
    expect(paid(plan, "a")).toBe(100000); // 60k on the invoice + 40k of the 70k on the event
  });
  it("an invoice paid by its own payments is not paid twice from the event's", () => {
    expect(paid(allocateEventReceipts([inv("a", 100000)], [rc(100000, { invoice_id: "a" }), rc(50000)]), "a")).toBe(100000);
  });
  it("spreads event payments over several invoices, oldest first", () => {
    const invoices = [inv("late", 50000, { invoice_date: "2026-11-05" }), inv("early", 40000, { invoice_date: "2026-11-01" })];
    const plan = allocateEventReceipts(invoices, [rc(60000)]);
    expect(paid(plan, "early")).toBe(40000);
    expect(paid(plan, "late")).toBe(20000);
  });
  it("a milestone's payments go to that milestone's invoice first", () => {
    const invoices = [inv("adv", 30000, { milestone_id: "m1", invoice_date: "2026-11-01" }), inv("final", 70000, { milestone_id: "m2", invoice_date: "2026-11-02" })];
    const plan = allocateEventReceipts(invoices, [rc(70000, { milestone_id: "m2" })]);
    expect(paid(plan, "final")).toBe(70000);
    expect(paid(plan, "adv")).toBe(0);
  });
  it("a payment on a milestone with no invoice still counts for the event's invoice", () => {
    expect(paid(allocateEventReceipts([inv("a", 50000)], [rc(50000, { milestone_id: "gone" })]), "a")).toBe(50000);
  });
  it("leaves drafts and cancelled invoices alone, and ignores a payment tied to a deleted invoice's id as loose money", () => {
    const plan = allocateEventReceipts([inv("d", 1000, { status: "draft" }), inv("c", 1000, { status: "cancelled" }), inv("a", 1000)], [rc(1000, { invoice_id: "deleted" })]);
    expect(plan.map((p) => p.id)).toEqual(["a"]);
    expect(paid(plan, "a")).toBe(1000);
  });
  it("rounds to paise and never goes above the invoice total", () => {
    expect(paid(allocateEventReceipts([inv("a", 100.1)], [rc(33.37), rc(33.37), rc(33.37), rc(50)]), "a")).toBe(100.1);
  });
});
