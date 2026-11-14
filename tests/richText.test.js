import { describe, it, expect } from "vitest";
import { sanitizeRichHtml } from "@/lib/richText";

// Empty editor text must count as "nothing in there", so invoices/quotations print no heading for it.
describe("sanitizeRichHtml with empty-looking text", () => {
  it.each([
    ["nothing", ""],
    ["null", null],
    ["blank paragraph left by the editor", "<p><br></p>"],
    ["several blank paragraphs", "<p><br></p><p><br/></p>"],
    ["spaces only", "   "],
    ["non-breaking spaces in a paragraph", "<p>&nbsp; &nbsp;</p>"],
  ])("%s gives an empty string", (_name, input) => {
    expect(sanitizeRichHtml(input)).toBe("");
  });

  it("keeps real plain text", () => {
    expect(sanitizeRichHtml("Pay in 7 days")).toContain("Pay in 7 days");
  });
});
