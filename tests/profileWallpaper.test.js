import { describe, it, expect } from "vitest";
import { buildWallpaperLayout, pickDominantColor, headerColors, hashString } from "@/lib/profileWallpaper";
import { PROFILE_DOODLES, PROFILE_TINTS, doodlesFor, tintFor } from "@/constants/profileWallpaper";
import { BUSINESS_CATEGORY_OPTIONS } from "@/lib/businessTerminology";

const px = (rgb, n) => Array(n).fill(rgb);
const toRgba = (pixels) => { const d = new Uint8ClampedArray(pixels.length * 4); pixels.forEach((p, i) => d.set([...p, 255], i * 4)); return d; };

describe("wallpaper layout", () => {
  const base = { width: 1000, height: 400, iconCount: 14, seed: 7 };

  it("is the same every time for the same business category", () => {
    expect(buildWallpaperLayout(base)).toEqual(buildWallpaperLayout(base));
  });
  it("covers the whole header, one pattern width wide per row", () => {
    const l = buildWallpaperLayout(base);
    expect(l.period).toBeGreaterThanOrEqual(1000);
    expect(l.rows.length).toBeGreaterThanOrEqual(Math.ceil(400 / 72));
    l.rows.forEach((r) => expect(r.cells.length * 72).toBe(l.period));
  });
  it("only uses icons that exist in the category's set", () => {
    buildWallpaperLayout(base).rows.forEach((r) => r.cells.forEach((c) => {
      expect(c.iconIndex).toBeGreaterThanOrEqual(0);
      expect(c.iconIndex).toBeLessThan(14);
    }));
  });
  it("random motion: rows go both ways at different (slow) paces", () => {
    const rows = buildWallpaperLayout({ ...base, motion: "random", motionSeed: 42 }).rows;
    expect(new Set(rows.map((r) => r.dir)).size).toBe(2);
    expect(new Set(rows.map((r) => Math.round(r.duration))).size).toBeGreaterThan(2);
    rows.forEach((r) => { expect(r.duration).toBeGreaterThanOrEqual(90); expect(r.duration).toBeLessThanOrEqual(180); });
  });
  it("left-to-right and right-to-left move every row the same way", () => {
    expect(new Set(buildWallpaperLayout({ ...base, motion: "ltr" }).rows.map((r) => r.dir))).toEqual(new Set(["r"]));
    expect(new Set(buildWallpaperLayout({ ...base, motion: "rtl" }).rows.map((r) => r.dir))).toEqual(new Set(["l"]));
  });
  it("draws nothing before the header has a size", () => {
    expect(buildWallpaperLayout({ ...base, width: 0 }).rows).toEqual([]);
  });
  it("different categories get different arrangements", () => {
    expect(hashString("PHOTOGRAPHY")).not.toBe(hashString("CATERING"));
  });
});

describe("every business category has its own doodles and tint", () => {
  it("covers all categories the app offers", () => {
    BUSINESS_CATEGORY_OPTIONS.forEach((o) => {
      expect(PROFILE_DOODLES[o.value], o.value).toBeTruthy();
      expect(PROFILE_DOODLES[o.value].length).toBeGreaterThanOrEqual(10);
      expect(PROFILE_TINTS[o.value], o.value).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
  it("every doodle is a real icon", () => {
    Object.values(PROFILE_DOODLES).flat().forEach((icon) => expect(icon).toBeTruthy());
  });
  it("an unknown category falls back safely", () => {
    expect(doodlesFor("SOMETHING_NEW")).toBe(PROFILE_DOODLES.OTHER);
    expect(tintFor(undefined)).toMatch(/^#/);
  });
});

describe("colour from the logo", () => {
  it("picks maroon from a maroon logo on a white background", () => {
    const c = pickDominantColor(toRgba([...px([138, 31, 61], 900), ...px([255, 255, 255], 1000), ...px([0, 0, 0], 300)]));
    expect(c.h).toBeGreaterThan(335); expect(c.h).toBeLessThan(352);
  });
  it("picks teal from a teal logo", () => {
    const c = pickDominantColor(toRgba([...px([15, 124, 122], 700), ...px([255, 255, 255], 1500)]));
    expect(c.h).toBeGreaterThan(170); expect(c.h).toBeLessThan(190);
  });
  it("a black-and-white logo has no colour", () => {
    expect(pickDominantColor(toRgba([...px([17, 17, 17], 900), ...px([255, 255, 255], 1400)]))).toBeNull();
  });
  it("ignores transparent pixels", () => {
    const d = new Uint8ClampedArray(8); d.set([200, 20, 20, 0, 200, 20, 20, 0]);
    expect(pickDominantColor(d)).toBeNull();
  });
  it("uses the dominant colour for the header, and the category tint when there is none", () => {
    const colored = headerColors({ h: 343, s: 0.63 }, "#1b1a2e");
    expect(colored.bg).toContain("hsl(343");
    expect(colored.glow).toContain("hsl(343");
    const plain = headerColors(null, "#1b1a2e");
    expect(plain.bg).toBe("#1b1a2e");
  });
});

import { pickLogoTone } from "@/lib/profileWallpaper";

// A 20x20 picture: `bg` everywhere except a 8x8 block in the middle painted `ink`.
function logo(bg, ink, size = 20) {
  const d = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const inside = x >= 6 && x < 14 && y >= 6 && y < 14;
    d.set(inside ? ink : bg, (y * size + x) * 4);
  }
  return d;
}
const T = [0, 0, 0, 0], BLACK = [0, 0, 0, 255], WHITE = [255, 255, 255, 255];

describe("black or white logo (no colour)", () => {
  it("black logo on a transparent background is dark", () => { expect(pickLogoTone(logo(T, BLACK), 20)).toBe("dark"); });
  it("white logo on a transparent background is light", () => { expect(pickLogoTone(logo(T, WHITE), 20)).toBe("light"); });
  it("black logo on a white background is dark", () => { expect(pickLogoTone(logo(WHITE, BLACK), 20)).toBe("dark"); });
  it("white logo on a black background is light", () => { expect(pickLogoTone(logo(BLACK, WHITE), 20)).toBe("light"); });
  it("a blank picture has no tone", () => { expect(pickLogoTone(logo(T, T), 20)).toBeNull(); });
});

describe("header theme by logo", () => {
  it("white logo -> blackish header, white doodles", () => {
    const c = headerColors(null, "#1b1a2e", "light");
    expect(c.light).toBe(false);
    expect(c.bg).toBe("#101010");
    expect(c.doodle).toBe("#ffffff");
  });
  it("black logo -> whitish header, dark doodles, dark text", () => {
    const c = headerColors(null, "#1b1a2e", "dark");
    expect(c.light).toBe(true);
    expect(c.bg).toBe("#f3f1ec");
    expect(c.doodle).toBe("#111111");
    expect(c.text).toBe("#141414");
  });
  it("coloured logo -> its colour in the background AND the doodles", () => {
    const c = headerColors({ h: 343, s: 0.63 }, "#1b1a2e", null);
    expect(c.bg).toContain("hsl(343");
    expect(c.doodle).toContain("hsl(343");
    expect(c.glow).toContain("hsl(343");
  });
  it("a coloured logo wins over any tone", () => {
    expect(headerColors({ h: 120, s: 0.5 }, "#000000", "dark").light).toBe(false);
  });
  it("no information -> category tint with white doodles and gold glow", () => {
    const c = headerColors(null, "#1b1a2e", null);
    expect(c.bg).toBe("#1b1a2e");
    expect(c.doodle).toBe("#ffffff");
    expect(c.glow).toBe("#f1d98d");
  });
});
