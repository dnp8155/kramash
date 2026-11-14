import { describe, it, expect } from "vitest";
import { isValidPhone, whatsappNumber } from "@/lib/validation";

describe("international phone numbers", () => {
  it("accepts numbers with a country code", () => {
    expect(isValidPhone("+1 202 555 0123")).toBe(true);
    expect(isValidPhone("+44 7911 123456")).toBe(true);
    expect(isValidPhone("+971 50 123 4567")).toBe(true);
    expect(isValidPhone("0091 98765 43210")).toBe(true);
  });
  it("still accepts Indian 10-digit mobiles and rejects junk", () => {
    expect(isValidPhone("9876543210")).toBe(true);
    expect(isValidPhone("1234567890")).toBe(false);
    expect(isValidPhone("+12")).toBe(false);
  });
  it("builds a WhatsApp number from an international one", () => {
    expect(whatsappNumber("+1 202 555 0123")).toBe("12025550123");
    expect(whatsappNumber("9876543210")).toBe("919876543210");
  });
});
