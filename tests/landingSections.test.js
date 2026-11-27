import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; });
vi.mock("react-router-dom", () => ({ Link: ({ children, to, className }) => h("a", { href: to, className }, children) }));
vi.mock("@/components/landing/Reveal", () => ({ default: ({ children }) => h("div", null, children) }));

import CTA from "@/components/landing/CTA";
import FeatureGroups from "@/components/landing/FeatureGroups";

describe("landing: closing call to action", () => {
  const html = renderToString(h(CTA));
  it("says what it should, without the removed label", () => {
    expect(html).toContain("You bring the vision.");
    expect(html).toContain("Kramasha runs the rest.");
    expect(html).not.toContain("Your craft. Your pace.");
  });
  it("puts the second half of the headline on its own line", () => {
    expect(html).toMatch(/cta-gradient-text block/);
  });
  it("uses the logo's colours for the glow and keeps the button off gold fill and gradients", () => {
    for (const c of ["#FCAD34", "#B125FC", "#1AD1E6", "#3265F0"]) expect(html.toLowerCase()).toContain(c.toLowerCase());
    const button = html.match(/<a[^>]*final_cta_start[^>]*>/)[0];
    expect(button).not.toContain("gradient");
    expect(button).not.toContain("bg-[#C8A95E]");
  });
});

describe("landing: features", () => {
  const html = renderToString(h(FeatureGroups)).replace(/&amp;/g, "&");
  it("lists the WhatsApp / email and automatic reminder features", () => {
    expect(html).toContain("WhatsApp & Email Messages");
    expect(html).toContain("Automatic Reminders");
    expect(html).toContain("nudge with the message ready to send");
  });
  it("keeps the existing groups", () => {
    for (const g of ["CAPTURE", "PLAN", "SELL", "GET PAID", "RUN", "WORK ANYWHERE"]) expect(html).toContain(g);
  });
});
