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
