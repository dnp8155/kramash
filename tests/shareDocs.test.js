import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; });
vi.mock("@/api/base44Client", () => ({ base44: { entities: {} } }));
vi.mock("@/hooks/useT", () => ({ useT: () => (s) => s }));

import { getTemplates, renderTemplate, buildValues, templateNeedsDoc, sampleValues } from "@/lib/messageTemplates";
import GoToEventLink from "@/components/events/GoToEventLink";
import { getBusinessTerminology } from "@/lib/businessTerminology";

const term = { workItemSingular: "Event" };
const base = { client: { name: "Priya" }, event: { title: "Sharma wedding", venue: "Grand Palace" }, workspace: { name: "Studio K" }, term, amount: "₹25,000", total: "₹75,000", paid: "₹50,000", dateLabel: "12 Dec" };

describe("send quotation / send invoice templates", () => {
  const tpls = getTemplates({}, "PHOTOGRAPHY");
  const quote = tpls.find((x) => x.id === "quotation_share");
  const invoice = tpls.find((x) => x.id === "invoice_share");

  it("exist as defaults and are the only ones that need a document number", () => {
    expect(quote && invoice).toBeTruthy();
    expect(tpls.filter(templateNeedsDoc).map((x) => x.id).sort()).toEqual(["invoice_share", "quotation_share"]);
  });
  it("fill in with the number, total and balance; the link line is optional", () => {
    const withLink = buildValues({ ...base, doc: "INV-12", link: "https://x.test/invoice/abc" });
    const body = renderTemplate(invoice.body, withLink);
    expect(body.missing).toEqual([]);
    expect(body.text).toContain("INV-12");
    expect(body.text).toContain("balance due ₹25,000");
    expect(body.text).toContain("View it here: https://x.test/invoice/abc");
    const noLink = renderTemplate(quote.body, buildValues({ ...base, doc: "QT-7" }));
    expect(noLink.missing).toEqual([]);
    expect(noLink.text).toContain("QT-7");
    expect(noLink.text).not.toContain("View it here");
  });
  it("without a document number they are flagged, so nothing half-empty goes out", () => {
    expect(renderTemplate(quote.body, buildValues(base)).missing).toContain("doc");
  });
  it("preview samples in Preferences are complete", () => {
    expect(renderTemplate(invoice.body, sampleValues({ workspace: {}, term })).missing).toEqual([]);
  });
});

describe("Go to event link follows the business", () => {
  const go = (ws) => getBusinessTerminology(ws).goToWorkItemLabel;
  it("uses each category's own word", () => {
    expect(go({ business_category: "PHOTOGRAPHY" })).toBe("Go to event");
    expect(go({ business_category: "EVENT_MANAGEMENT" })).toBe("Go to event");
    expect(go({ business_category: "ARCHITECTURE" })).toBe("Go to project");
    expect(go({ business_category: "SALON_BEAUTY" })).toBe("Go to appointment");
    expect(go({ business_category: "CONSULTING" })).toBe("Go to engagement");
  });
  it("follows a custom work label from Preferences", () => {
    expect(go({ business_category: "PHOTOGRAPHY", custom_work_label_singular: "Shoot", custom_work_label_plural: "Shoots" })).toBe("Go to shoot");
  });
  it("renders the label with the job's name, and nothing without an event", () => {
    const term = getBusinessTerminology({ business_category: "ARCHITECTURE" });
    const html = renderToString(h(GoToEventLink, { event: { title: "Desai Residence" }, term, onOpen: () => {} }));
    expect(html).toContain("Go to project");
    expect(html).toContain("Desai Residence");
    expect(renderToString(h(GoToEventLink, { event: null, term, onOpen: () => {} }))).toBe("");
  });
});
