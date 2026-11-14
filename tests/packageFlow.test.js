import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/base44Client", () => ({ base44: { auth: { me: async () => ({}) }, entities: {} } }));

import { buildStructure, newItem, packagePrice, packageTotal, parseGroups, parseOverride } from "@/lib/packageStructure";
import { deserializePackageStructure } from "@/lib/quotationService";
import { computeTotals, lineTotal } from "@/lib/quotationCalc";
import { computeInvoiceTotals } from "@/lib/invoiceService";

// A package built directly in Preferences, carried into a quotation (as applyPackage does), then into the invoice
// (as createFromQuotation does for photography / event packages: ONE package line = sum of the items, plus the
// quotation's manual subtotal and discount).
const pkgItems = [
  { ...newItem("role"), name: "Lead Photographer", unit_rate: 10000, rate_type: "Per Day", quantity: 1, days: 2, gst_rate: 18 },
  { ...newItem("service"), name: "Album", unit_rate: 15000, rate_type: "Fixed", quantity: 1, gst_rate: 18 },
  { ...newItem("custom"), name: "Drone", unit_rate: 5000, rate_type: "Fixed", quantity: 1, gst_rate: 18 },
];
const structure = buildStructure([{ day_date: "uncategorized", phase_title: "", items: pkgItems }]);
const itemsTotal = packageTotal(parseGroups(structure)); // 20000 + 15000 + 5000

const asQuotationItems = (json) => deserializePackageStructure(json, []).map((it) => ({ ...it, line_total: lineTotal(it) }));

describe("a package carried into a quotation and an invoice", () => {
  it("brings its items across with the amounts the package showed", () => {
    const q = asQuotationItems(structure);
    expect(q).toHaveLength(3);
    expect(q.reduce((s, it) => s + it.line_total, 0)).toBe(itemsTotal);
    expect(itemsTotal).toBe(40000);
  });

  it("without a custom price, quotation and invoice both charge the items total", () => {
    const q = computeTotals(asQuotationItems(structure), { discountType: "percent", discountValue: 0 });
    const inv = computeInvoiceTotals([{ item_type: "package", quantity: 1, unit_rate: itemsTotal }], {});
    expect(q.grandTotal).toBe(40000);
    expect(inv.grandTotal).toBe(40000);
  });

  it("with a custom price, quotation and invoice charge that price, and the margin stays hidden inside it", () => {
    const price = parseOverride("50000");
    expect(packagePrice(parseGroups(structure), price)).toBe(50000);
    const q = computeTotals(asQuotationItems(structure), { finalTotal: price });
    expect(q.grandTotal).toBe(50000);
    expect(q.adjustmentAmount).toBe(10000); // the owner's margin
    const inv = computeInvoiceTotals([{ item_type: "package", quantity: 1, unit_rate: itemsTotal }], { finalTotal: price });
    expect(inv.grandTotal).toBe(50000);
  });

  it("keeps quotation and invoice equal with a discount and GST on top of the custom price", () => {
    const opts = { finalTotal: 50000, discountType: "percent", discountValue: 10, gstApplicable: true, gstMode: "cgst_sgst" };
    const q = computeTotals(asQuotationItems(structure), opts);
    // createFromQuotation derives the invoice's flat GST rate from the quotation (gstTotal / taxable).
    const gstRate = Math.round((q.gstTotal / q.taxableAmount) * 10000) / 100;
    const inv = computeInvoiceTotals([{ item_type: "package", quantity: 1, unit_rate: itemsTotal }], { ...opts, gstRate });
    expect(q.taxableAmount).toBe(45000);
    expect(q.grandTotal).toBe(53100); // 45000 + 18% GST
    expect(inv.grandTotal).toBe(q.grandTotal);
  });

  it("applying a package with no custom price clears the quotation's old manual subtotal", () => {
    expect(parseOverride(null) ?? "").toBe("");
    expect(parseOverride(undefined) ?? "").toBe("");
  });
});
