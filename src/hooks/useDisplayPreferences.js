// Centralized display preferences — reads from workspace.display_preferences (JSON string)
// and provides parsed values with sensible defaults. All display toggles across the app
// (status colors, member type colors, status dots, show team/services, card display)
// flow through this hook so Preferences is the single source of truth.
import { useEffect } from "react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getMemberTypes, getMemberTypeColor } from "@/lib/memberTypeService";

const DEFAULTS = {
  // Feature 1 — event status colors (dots + badges)
  showProgressIndicators: true,
  // Feature 2 — member type tag colors (Bride Side / Groom Side / Common, etc.)
  showMemberTypeColors: true,
  // Feature 3 — ALL status dots (event status dots + person status dots)
  showStatusDots: true,
  // Feature 4 — team / services lists on event detail page (and event cards)
  showTeam: true,
  showServices: true,
  // Feature 5 — Pro-only: address/venue and services on compact cards & tables
  showAddressOnCards: false,
  showServicesOnCards: false,
  // Group upcoming events in the events list (This Week / All) vs flat list
  groupUpcoming: true,
  // Show text labels under icons in the mobile/PWA bottom navigation
  showMenubarLabels: true,
  // Pastel theme — custom palette (array of 3–5 hex strings). null = use category default.
  pastelPalette: null,
  // Shared invoice
  showLogo: false,
  // Quotation defaults (set in Preferences → Quotation tab)
  defaultTerms: "",
  defaultPaymentMethod: "",
  defaultPaymentInstructions: "",
  showLogoOnQuotation: true,
  showLogoWatermark: true,
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

// Returns the array of configured member types from the workspace (single source of truth).
export function useMemberTypes() {
  const { workspace } = useWorkspace();
  return getMemberTypes(workspace);
}

// Resolves the configured color for a member type by ID (preferred) or label (fallback).
// Color comes from the type definition — never stored on the member record.
export function useMemberTypeColors() {
  const { workspace } = useWorkspace();
  return (idOrLabel) => getMemberTypeColor(workspace, idOrLabel);
}

// Applies the global "dots-hidden" body class when showStatusDots is OFF.
// CSS rules in index.css hide .status-dot, .type-dot, .team-chip-dot, .cal-today-dot.
// Changing this setting does NOT change underlying data — it only controls dot visibility.
export function useDotsHidden() {
  const { showStatusDots } = useDisplayPreferences();
  useEffect(() => {
    if (showStatusDots) {
      document.body.classList.remove("dots-hidden");
    } else {
      document.body.classList.add("dots-hidden");
    }
    return () => document.body.classList.remove("dots-hidden");
  }, [showStatusDots]);
}