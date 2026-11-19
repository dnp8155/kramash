import { describe, it, expect } from "vitest";
import { photoStyle, photoHeight, galleryHtml } from "@/components/quotation/templates/templateShared";

const land = { url: "data:a", w: 1500, h: 1000 };   // 3:2
const port = { url: "data:b", w: 1000, h: 1500 };   // 2:3

describe("PDF pictures keep their shape", () => {
  it("never uses object-fit (html2canvas ignores it and stretches the picture)", () => {
    expect(galleryHtml([land, port, land])).not.toContain("object-fit");
    expect(galleryHtml([land])).toContain("background-image");
  });
  it("a picture close to its box fills it, kept toward the top", () => {
    expect(photoStyle(land, 600, 400)).toContain("background-size:cover");
    expect(photoStyle(land, 600, 400)).toContain("center 30%");
  });
  it("a tall picture in a wide box is shown whole, not cut", () => {
    expect(photoStyle(port, 1000, 300)).toContain("background-size:contain");
  });
  it("box height follows the picture, within limits", () => {
    expect(photoHeight([land], 1000, 220, 560, 260)).toBe(560); // 1000 / 1.5 = 667 → capped at 560
    expect(photoHeight([{ url: "x", w: 3000, h: 1000 }], 1000, 220, 560, 260)).toBe(333);
    expect(photoHeight([{ url: "x" }], 1000, 220, 560, 260)).toBe(260); // size unknown → old height
  });
  it("pictures with unknown size still fill their box as before", () => {
    expect(photoStyle({ url: "x" }, 1000, 260)).toContain("background-size:cover");
  });
});
