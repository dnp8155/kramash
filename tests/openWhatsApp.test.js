import { describe, it, expect } from "vitest";
import { whatsappAppUrl } from "@/lib/openWhatsApp";

describe("WhatsApp links open the app directly (installed app)", () => {
  it("chat with a number + message", () => {
    expect(whatsappAppUrl("https://wa.me/919876543210?text=Hi%20there%20%26%20more")).toBe("whatsapp://send?phone=919876543210&text=Hi%20there%20%26%20more");
  });
  it("share without a number", () => {
    expect(whatsappAppUrl("https://wa.me/?text=Line1%0ALine2")).toBe("whatsapp://send?text=Line1%0ALine2");
  });
  it("a hand-typed + in the number", () => {
    expect(whatsappAppUrl("https://wa.me/+919876543210")).toBe("whatsapp://send?phone=919876543210");
  });
  it("number only", () => {
    expect(whatsappAppUrl("https://wa.me/919876543210")).toBe("whatsapp://send?phone=919876543210");
  });
  it("api.whatsapp.com/send", () => {
    expect(whatsappAppUrl("https://api.whatsapp.com/send?phone=+91 98765&text=ok")).toBe("whatsapp://send?phone=9198765&text=ok");
  });
  it("leaves other links alone", () => {
    expect(whatsappAppUrl("https://wa.me/message/ABC123")).toBeNull();
    expect(whatsappAppUrl("https://chat.whatsapp.com/xyz")).toBeNull();
    expect(whatsappAppUrl("https://kramasha.com/p/abc")).toBeNull();
  });
});
