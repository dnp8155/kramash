import { describe, it, expect } from "vitest";
import { plainChatText } from "@/lib/chatText";

describe("plainChatText", () => {
  it("turns headings, bold and bullets into plain readable text", () => {
    const md = "### Payment dues\n\n**Total:** ₹1,05,000\n\n* **Ravi** – ₹5,000\n* Amit – ₹2,500\n\n---\nDone *now*.";
    expect(plainChatText(md)).toBe("Payment dues\n\nTotal: ₹1,05,000\n\n• Ravi – ₹5,000\n• Amit – ₹2,500\n\nDone now.");
  });

  it("keeps plain text, amounts and numbered lists as they are", () => {
    const text = "1. Open Events\n2. Tap New Event\nPending: ₹2,500 x 3";
    expect(plainChatText(text)).toBe(text);
  });

  it("removes link markup and half-finished bold while streaming", () => {
    expect(plainChatText("See [Help](https://x.com) for **more")).toBe("See Help for more");
  });
});

import { parseChatBlocks, parseInline } from "../src/lib/chatText";
describe("parseChatBlocks", () => {
  it("groups headings, bullets, steps and paragraphs", () => {
    const b = parseChatBlocks("You have 2 payments due:\n\n• Ravi Patel – ₹5,000\n• Mehta – ₹2,500\n\n1. Open Financial\n2. Tap Add\n\nAnything else?");
    expect(b.map((x) => x.type)).toEqual(["heading", "ul", "ol", "para"]);
    expect(b[1].items).toHaveLength(2);
    expect(b[2].items).toEqual(["Open Financial", "Tap Add"]);
  });
  it("still strips stray markdown", () => {
    expect(parseChatBlocks("**Hi** there")[0].text).toBe("Hi there");
  });
  it("finds amounts", () => {
    expect(parseInline("Due ₹1,05,000 today").map((p) => p.t)).toEqual(["text", "amount", "text"]);
  });
});

import { localizeDates, splitItem } from "../src/lib/chatText";
describe("chat dates and layout", () => {
  it("formats ISO dates and folds runs", () => {
    expect(localizeDates("On 2026-11-15")).not.toMatch(/2026-11-15/);
    const run = localizeDates("2026-12-09, 2026-12-10, 2026-12-11");
    expect(run).not.toMatch(/2026-12-09/);
    expect(run.split(",").length).toBeLessThan(3 + 1);
  });
  it("groups Label: value lines", () => {
    const b = parseChatBlocks("Date: 2026-11-15\nClient: Parth S Shah\nVenue: Stellar Kitchen");
    expect(b).toHaveLength(1);
    expect(b[0].type).toBe("kv");
    expect(b[0].items.map((x) => x.label)).toEqual(["Date", "Client", "Venue"]);
  });
  it("splits a long item into title and details", () => {
    const r = splitItem("Prachi's Baby Shower – 17 Nov 2026 at Atithya Banquet");
    expect(r.title).toBe("Prachi's Baby Shower");
    expect(r.details).toEqual(["17 Nov 2026", "Atithya Banquet"]);
  });
});

import { buildLinkIndex, findEntityLink, findPageLink } from "../src/lib/chatText";
describe("open links", () => {
  const idx = buildLinkIndex({
    events: [{ id: "e1", title: "Bhargavi's Baby Shower" }, { id: "e2", title: "Twin" }, { id: "e3", title: "Twin" }],
    clients: [{ id: "c1", name: "Parth S Shah" }],
    members: [{ id: "m1", name: "Ravi" }],
  });
  it("finds the event named in a line", () => {
    expect(findEntityLink("Bhargavi's Baby Shower – 15 Nov 2026", idx)?.to).toBe("/events/e1");
    expect(findEntityLink("Client: Parth S Shah", idx)?.to).toBe("/clients/c1");
  });
  it("skips duplicate names and partial words", () => {
    expect(findEntityLink("Twin shoot", idx)).toBeNull();
    expect(findEntityLink("Raviraj paid", idx)).toBeNull();
  });
  it("finds page names", () => {
    expect(findPageLink("Open the Financial page and tap Add")?.to).toBe("/financial");
    expect(findPageLink("Nothing here")).toBeNull();
  });
});
