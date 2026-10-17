// Team member color palette for visual identification across the app.
// Colors are assigned automatically on creation and can be changed in Preferences.

export const TEAM_COLOR_PALETTE = [
  "#0d9488", // teal
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal-light
  "#f97316", // orange
  "#3b82f6", // blue
  "#84cc16", // lime
  "#a855f7", // purple
  "#06b6d4", // cyan
];

// Deterministically pick a color for a team member based on their name.
// Falls back to sequential palette colors so members get distinct colors.
export function pickTeamColor(name, existingCount = 0) {
  if (!name) return TEAM_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TEAM_COLOR_PALETTE.length;
  return TEAM_COLOR_PALETTE[idx];
}

// Get the color for a member, falling back to a default if not set.
export function getMemberColor(member) {
  return member?.color || TEAM_COLOR_PALETTE[0];
}

// Convert hex to a soft background tint (for badges, chips, calendar dots).
export function colorTint(hex, alpha = 0.15) {
  if (!hex) return `rgba(13, 148, 136, ${alpha})`;
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(13, 148, 136, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}