import { describe, it, expect, vi } from "vitest";

// Some modules the template pulls in register browser listeners at load; there is no browser here.
vi.hoisted(() => { globalThis.window = globalThis; globalThis.document = { addEventListener() {} }; globalThis.addEventListener = () => {}; });

import { renderClassicMinimal } from "@/components/quotation/templates/classicMinimalTemplate";

// The slider sets one value; the quotation and the invoice must both draw their watermark with it.
describe("quotation watermark follows the opacity slider", () => {
  const render = (prefs) => renderClassicMinimal({
    workspace: { name: "Studio", logo: "https://example.com/logo.png", display_preferences: JSON.stringify(prefs) },
    quotation: { quotation_number: "QT-1", quotation_date: "2026-10-15", grand_total: 1000, subtotal: 1000 },
    client: { name: "Priya" },
    event: { title: "Wedding", start_date: "2026-12-12" },
    items: [],
    currency: "INR",
    templateConfig: {},
  });
  it("uses the chosen opacity", () => {
    expect(render({ logoWatermarkOpacity: 18 })).toContain("opacity: 0.18;");
  });
  it("keeps the old 5% when nothing was chosen, and clamps silly values", () => {
    expect(render({})).toContain("opacity: 0.05;");
    expect(render({ logoWatermarkOpacity: 500 })).toContain("opacity: 0.3;");
  });
  it("draws no watermark when it is switched off", () => {
    expect(render({ showLogoWatermark: false })).not.toContain('class="watermark"');
  });
});
