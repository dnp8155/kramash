// Pastel theme system — 5 default pastel colors the user manually picks from.
// No automatic assignment to event/work types; the selected color is applied as
// the app's accent (primary/accent/ring tokens) when the "Pastel" theme is active.

// A single set of 5 pleasant pastel colors (not per-category — user picks manually).
export const DEFAULT_PASTEL_COLORS = [
  "#F4A6B8", // rose
  "#A8C8E8", // sky
  "#B8D8A8", // sage
  "#F4D4A8", // sand
  "#C8A8D8", // lavender
];

export const PASTEL_COLOR_COUNT = 5;

export function getDefaultPalette() {
  return [...DEFAULT_PASTEL_COLORS];
}

// Convert a hex color (#RRGGBB) to HSL components { h, s, l } as numbers.
// Used to apply a pastel color as a CSS variable (e.g. --primary).
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}