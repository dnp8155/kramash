// Shared side/side-type configuration for team assignment category_type.
// Used by Progress page components. Labels and colors are not hardcoded to
// Bride/Groom only — any custom category_type value gets a neutral badge
// with its own label.

export const sideConfig = {
  Bride: { badge: "bg-pink-100 text-pink-700 border-pink-200", label: "Bride Side" },
  Groom: { badge: "bg-blue-100 text-blue-700 border-blue-200", label: "Groom Side" },
  Other: { badge: "bg-muted text-muted-foreground border-border", label: "Common" },
};

export const sideOrder = ["Bride", "Groom", "Other"];

export function getSideConfig(side) {
  return sideConfig[side] || {
    badge: "bg-muted text-muted-foreground border-border",
    label: side || "Common",
  };
}