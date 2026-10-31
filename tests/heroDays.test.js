import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; });
vi.mock("react-router-dom", () => ({ Link: ({ children, to }) => h("a", { href: to }, children) }));
vi.mock("@/components/landing/Reveal", () => ({ default: ({ children }) => h("div", null, children) }));

import { HERO_BUSINESSES } from "@/components/landing/heroDays";
import Hero from "@/components/landing/Hero";

describe("hero", () => {
  it("lists six businesses whose headline words stay short enough for one line", () => {
    expect(HERO_BUSINESSES).toHaveLength(6);
    for (const b of HERO_BUSINESSES) expect(b.word.length).toBeLessThanOrEqual(16);
  });
  it("renders every business word in place (so the headline never resizes), the pills, and the real app pictures", () => {
    const html = renderToString(h(Hero)).replace(/&amp;/g, "&");
    expect(html).toContain("I run a");
    for (const b of HERO_BUSINESSES) { expect(html).toContain(b.word); expect(html).toContain(b.label); }
    expect(html).toContain("/landing/dashboard-desktop.webp");
    expect(html).toContain("/landing/dashboard-phone.webp");
    expect(html).toContain("Sign up free");
  });
});
