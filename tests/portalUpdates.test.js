import { describe, it, expect } from "vitest";
import { portalSignature } from "@/lib/portalSignature";

describe("portal 'New update' detection", () => {
  it("same details in a different key order = no update", () => {
    expect(portalSignature({ a: 1, b: { c: 2, d: [1, 2] } })).toBe(portalSignature({ b: { d: [1, 2], c: 2 }, a: 1 }));
  });
  it("a real change (payment, date, step) = update", () => {
    const before = { payments: [{ amount: 50000, status: "due" }], dates: ["2026-12-10"] };
    expect(portalSignature(before)).not.toBe(portalSignature({ ...before, payments: [{ amount: 50000, status: "paid" }] }));
    expect(portalSignature(before)).not.toBe(portalSignature({ ...before, dates: ["2026-12-11"] }));
  });
  it("view counters and 'viewed at' times never count as an update", () => {
    const base = { quotation: { title: "Wedding", portal_view_count: 3, portal_latest_viewed_at: "2026-11-21T10:00:00Z" }, auto_linked: false };
    const later = { quotation: { title: "Wedding", portal_view_count: 9, portal_latest_viewed_at: "2026-11-21T12:00:00Z" }, auto_linked: true };
    expect(portalSignature(base)).toBe(portalSignature(later));
  });
});
