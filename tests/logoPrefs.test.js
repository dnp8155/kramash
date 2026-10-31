import { describe, it, expect } from "vitest";
import { invoiceLogoOn, receiptLogoDefault, watermarkOpacity } from "@/lib/logoPrefs";
import { renderInvoiceSimpleBw } from "@/components/invoice/templates/invoiceSimpleBwTemplate";

describe("shared logo preferences", () => {
  it("invoices: own switch wins, else follow the quotation logo switch, else on", () => {
    expect(invoiceLogoOn({})).toBe(true);
    expect(invoiceLogoOn(undefined)).toBe(true);
    expect(invoiceLogoOn({ showLogoOnQuotation: false })).toBe(false);
    expect(invoiceLogoOn({ showLogoOnInvoice: true, showLogoOnQuotation: false })).toBe(true);
    expect(invoiceLogoOn({ showLogoOnInvoice: false, showLogoOnQuotation: true })).toBe(false);
  });
  it("receipts: off unless switched on (as before)", () => {
    expect(receiptLogoDefault({})).toBe(false);
    expect(receiptLogoDefault({ showLogo: true })).toBe(true);
  });
});

describe("invoice template honours the invoice logo switch", () => {
  const base = (prefs) => renderInvoiceSimpleBw({
    workspace: { name: "Studio", logo: "https://example.com/logo.png", display_preferences: JSON.stringify(prefs) },
    invoice: { invoice_number: "INV-1", invoice_date: "2026-10-15", grand_total: 1000, subtotal: 1000, business_snapshot: JSON.stringify({ name: "Studio", logo: "https://example.com/logo.png" }), client_snapshot: "{}", event_snapshot: "{}" },
    items: [{ description: "Work", quantity: 1, unit_price: 1000, line_total: 1000 }],
    currency: "INR",
    totals: { subtotal: 1000, discountAmount: 0, taxableAmount: 1000, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, gstTotal: 0, grandTotal: 1000 },
  });
  it("shows the logo (header + watermark) by default", () => {
    const html = base({});
    expect(html).toContain('class="header-logo"');
    expect(html).toContain('class="watermark"');
  });
  it("hides every logo when invoices are switched off", () => {
    const html = base({ showLogoOnInvoice: false });
    expect(html).not.toContain('class="header-logo"');
    expect(html).not.toContain('class="watermark"');
  });
  it("an old workspace with the quotation logo off keeps invoices logo-free until it chooses", () => {
    expect(base({ showLogoOnQuotation: false })).not.toContain('class="header-logo"');
    expect(base({ showLogoOnQuotation: false, showLogoOnInvoice: true })).toContain('class="header-logo"');
  });
});

describe("watermark opacity", () => {
  const html = (prefs) => renderInvoiceSimpleBw({
    workspace: { name: "Studio", logo: "https://example.com/logo.png", display_preferences: JSON.stringify(prefs) },
    invoice: { invoice_number: "INV-1", invoice_date: "2026-10-15", grand_total: 1000, subtotal: 1000, business_snapshot: JSON.stringify({ name: "Studio", logo: "https://example.com/logo.png" }), client_snapshot: "{}", event_snapshot: "{}" },
    items: [{ description: "Work", quantity: 1, unit_price: 1000, line_total: 1000 }],
    currency: "INR",
    totals: { subtotal: 1000, discountAmount: 0, taxableAmount: 1000, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, gstTotal: 0, grandTotal: 1000 },
  });
  it("defaults to 5% and clamps out-of-range values", () => {
    expect(watermarkOpacity({})).toBe(0.05);
    expect(watermarkOpacity({ logoWatermarkOpacity: 12 })).toBe(0.12);
    expect(watermarkOpacity({ logoWatermarkOpacity: 99 })).toBe(0.3);
    expect(watermarkOpacity({ logoWatermarkOpacity: 0 })).toBe(0.01);
    expect(watermarkOpacity({ logoWatermarkOpacity: "abc" })).toBe(0.05);
  });
  it("invoice watermark uses the chosen opacity", () => {
    expect(html({ logoWatermarkOpacity: 15 })).toContain("opacity: 0.15;");
    expect(html({})).toContain("opacity: 0.05;");
  });
});
