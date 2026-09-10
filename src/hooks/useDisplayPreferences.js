// Centralized display preferences — reads from workspace.display_preferences (JSON string)
// and provides parsed values with sensible defaults. All display toggles across the app
// (status colors, member type colors, status dots, show team/services, card display)
// flow through this hook so Preferences is the single source of truth.
import { useWorkspace } from "@/lib/WorkspaceContext";

const DEFAULTS = {
  // Feature 1 — event status colors (dots + badges)
  showProgressIndicators: true,
  // Feature 2 — member type tag colors (Bride Side / Groom Side / Common, etc.)
  showMemberTypeColors: true,
  // Feature 3 — person status dots before team/client names
  showStatusDots: true,
  // Feature 4 — team / services lists on event detail page (and event cards)
  showTeam: true,
  showServices: true,
  // Feature 5 — Pro-only: address/venue and services on compact cards & tables
  showAddressOnCards: false,
  showServicesOnCards: false,
  // Shared invoice
  showLogo: false,
};

export function useDisplayPreferences() {
  const { workspace } = useWorkspace();
  let prefs = { ...DEFAULTS };
  if (workspace?.display_preferences) {
    try {
      const parsed = JSON.parse(workspace.display_preferences);
      prefs = { ...DEFAULTS, ...parsed };
    } catch {
      // keep defaults on parse error
    }
  }
  return prefs;
}

// Resolves the configured color for a member type title from workspace.team_member_types.
// Falls back to hardcoded defaults for Bride/Groom/Common when no config exists.
export function useMemberTypeColors() {
  const { workspace } = useWorkspace();
  return (title) => {
    if (!title) return null;
    try {
      const types = workspace?.team_member_types ? JSON.parse(workspace.team_member_types) : null;
      if (types && Array.isArray(types)) {
        const found = types.find((t) => t.title === title);
        if (found) return found.color;
      }
    } catch {
      // ignore
    }
    const l = title.toLowerCase();
    if (l.includes("bride")) return "#ec4899";
    if (l.includes("groom")) return "#3b82f6";
    return "#6b7280";
  };
}