// Pastel theme system — default palettes per business category + event-type color resolver.
// Pastel colors apply ONLY to event-type indicators (dots/badges) when the "Pastel"
// theme is active. They never override primary theme tokens, so buttons/links/focus
// states keep their contrast. Filled dots render acceptably on both light (warm beige)
// and dark backgrounds.

export const PASTEL_PALETTES = {
  PHOTOGRAPHY: ["#F4A6B8", "#A8C8E8", "#B8D8A8", "#F4D4A8", "#C8A8D8"],
  EVENT_MANAGEMENT: ["#F4C9A8", "#C8E8A8", "#A8E8D0", "#F4A8A8", "#A8D8E8"],
  ARCHITECTURE: ["#C8D0D8", "#D8C8C0", "#C0C8E0", "#BCC4CC", "#D0D8B8"],
  INTERIOR: ["#E8C8D8", "#C8D8E0", "#D8E0C8", "#E0C8C0", "#D0C8E8"],
  SALON_BEAUTY: ["#F4B8C8", "#E8C8D8", "#F4D8C0", "#D8C0E0", "#C8D8F0"],
  CONSULTING: ["#C8D0E0", "#D0C8D8", "#C8D8C8", "#D8D0C0", "#C0C8E8"],
  AGENCY: ["#F4C0A8", "#A8C8E0", "#C8D8F0", "#F4A8C0", "#A8E0D0"],
  CATERING: ["#F4D0A8", "#E8E0A8", "#C8E0B8", "#F4B8A8", "#D8C8A8"],
  CONTRACTING: ["#D0C8C0", "#C8D0C8", "#C0C8D0", "#D8D0C8", "#C8C0C8"],
  OTHER: ["#D8A8E0", "#A8D8D0", "#E8E0A8", "#F4C0A8", "#C0C8E8"],
};

export const MIN_PALETTE = 3;
export const MAX_PALETTE = 5;

export function getDefaultPalette(category) {
  return [...(PASTEL_PALETTES[category] || PASTEL_PALETTES.OTHER)];
}

// Deterministic hash so the same event type always maps to the same color slot.
function hashIndex(str, mod) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return mod > 0 ? h % mod : 0;
}

export function resolveEventTypeColor(type, palette) {
  if (!palette || palette.length === 0) return null;
  return palette[hashIndex(type, palette.length)];
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