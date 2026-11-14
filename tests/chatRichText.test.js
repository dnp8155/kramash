import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

vi.hoisted(() => { globalThis.window = globalThis; });
vi.mock("@/hooks/useT", () => ({ useT: () => (s) => s }));

import ChatRichText from "@/components/common/ChatRichText";
import { buildLinkIndex } from "@/lib/chatText";

const reply = [
  "Your next upcoming event is",
  "",
  "• Bhargavi's Baby Shower",
  "",
  "Date: 2026-11-15",
  "Client: Parth S Shah",
  "Venue: Stellar Kitchen",
  "",
  "Here are your other upcoming events:",
  "",
  "• Wedding T&C – 2026-11-22, 2026-12-09, 2026-12-10 at Day 1: Tarasuns · Day 2: Bride's Home",
  "• Ravi Patel – ₹5,000",
  "",
  "1. Open Financial",
  "2. Tap Add",
  "Open the Financial page to see more.",
].join("\n");

describe("assistant reply, rich text", () => {
  const index = buildLinkIndex({ events: [{ id: "e1", title: "Bhargavi's Baby Shower" }], clients: [{ id: "c1", name: "Parth S Shah" }], members: [] });
  const html = renderToString(h(ChatRichText, { text: reply, linkIndex: index, onOpen: () => {}, hint: "Tap the round arrow", onHasLinks: () => {} })).replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

  it("shows dates the workspace way, not as 2026-11-15", () => {
    expect(html).not.toMatch(/2026-11-15/);
    expect(html).toContain("15 Nov 2026");
  });
  it("turns Label: value lines into one details box, bullets into a list and steps into numbers", () => {
    expect(html).toContain("<dl");
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("Stellar Kitchen");
  });
  it("adds Open buttons for your own event, client and the Financial page, once each, with the one-time hint", () => {
    expect(html).toContain('aria-label="Open event"');
    expect(html).toContain('aria-label="Open client"');
    expect(html).toContain('aria-label="Open Financial"');
    expect((html.match(/aria-label="Open event"/g) || []).length).toBe(1);
    expect(html).toContain("Tap the round arrow");
  });
  it("highlights amounts and folds the long date run", () => {
    expect(html).toContain("₹5,000");
    expect(html).not.toContain("2026-12-09");
  });
});
