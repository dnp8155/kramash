// Pastel theme system — default palettes per business category + event-type color resolver.
// Pastel colors apply ONLY to event-type indicators (dots/badges) when the "Pastel"
// theme is active. They never override primary theme tokens, so buttons/links/focus
// states keep their contrast. Filled dots render acceptably on both light (warm beige)
// and dark backgrounds.

export const PASTEL_PALETTES = {
  PHOTOGRAPHY: ["#F4A6B8", "#A8C8E8", "#B8D8A8", "#F4D4A8", "#C8A8D8"],
  EVENT_MANAGEMENT: ["#F4C9A8", "#C8E8A8", "#A8E8D0", "#F4A8A8", "#A8D8E8"],
  ARCHITECTURE: ["#C8D0D8", "#D8C8C0", "#C0C8E0", "#BCC4CC", "#D0D8B8"],
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