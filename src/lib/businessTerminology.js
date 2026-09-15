// Central multi-industry terminology system.
// Single source of truth for all category-aware labels. All UI components
// consume this via getBusinessTerminology(workspace) or useBusinessTerminology().
// Profiles are defined in businessTypeProfiles.js — this module derives the
// full terminology object (all UI labels) from the selected profile.

import {
  BUSINESS_TYPE_PROFILES,
  BUSINESS_CATEGORY_KEYS,
  getProfile,
  inferCategoryFromType as inferCategory,
} from "@/lib/businessTypeProfiles";

// Re-export for backward compatibility (BUSINESS_CATEGORIES used across the app).
export const BUSINESS_CATEGORIES = Object.fromEntries(
  BUSINESS_CATEGORY_KEYS.map((k) => [k, k])
);

// Re-export the icon map for UI rendering.
export { BUSINESS_TYPE_ICONS } from "@/lib/businessTypeProfiles";

// Options array for selectors / card grids (label + description from profiles).
export const BUSINESS_CATEGORY_OPTIONS = BUSINESS_CATEGORY_KEYS.map((key) => {
  const p = BUSINESS_TYPE_PROFILES[key];
  return { value: key, label: p.label, description: p.description };
});

export function categoryLabel(value) {
  const p = BUSINESS_TYPE_PROFILES[value];
  return p ? p.label : value || "Other";
}

// Resolve the effective business category for a workspace (with safe default).
export function resolveBusinessCategory(workspace) {
  if (workspace?.business_category) return workspace.business_category;
  return inferCategory(workspace?.business_type);
}

// Re-export inferCategoryFromType for backward compatibility.
export { inferCategory as inferCategoryFromType };

// Build the full terminology object from a profile's core fields.
// Derives all UI labels (create/edit/view, active/total/completed, etc.)
// from workItemSingular / workItemPlural so profiles stay DRY.
function buildTerminology(profile) {
  const s = profile.workItemSingular;
  const p = profile.workItemPlural;
  const sl = s.toLowerCase();
  const pl = p.toLowerCase();
  return {
    workItemSingular: s,
    workItemPlural: p,
    createWorkItemLabel: `Create ${s}`,
    editWorkItemLabel: `Edit ${s}`,
    viewWorkItemLabel: `View ${s}`,
    addWorkItemLabel: `Add ${s}`,
    workItemDetailsLabel: `${s} Details`,
    workItemTitleLabel: `${s} Title`,
    workItemTypeLabel: `${s} Type`,
    locationLabel: profile.locationLabel,
    locationAddressLabel: profile.locationAddressLabel,
    titlePlaceholder: profile.titlePlaceholder,
    dateLabel: "Start Date",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    teamLabel: "Team",
    activeWorkLabel: `Active ${p}`,
    totalWorkLabel: `Total ${p}`,
    completedWorkLabel: `Completed ${p}`,
    profitabilityLabel: `${s} Profitability`,
    financialSummaryLabel: `${s} Financial Summary`,
    searchPlaceholder: profile.searchPlaceholder,
    clientWorkLabel: `Client ${p}`,
    bookedLabel: `Assigned to ${s}`,
    exportPrefix: p,
    quotationSectionLabel: s.toUpperCase(),
    emptyTitle: `No ${pl} yet`,
    emptyDescription: `Create your first ${sl} to get started.`,
    reminderTomorrowLabel: `${s} tomorrow`,
    reminderComingLabel: `${s} coming up`,
    reminderMessage: (title, date, venue) =>
      `"${title}" is scheduled for ${date}${venue ? ` at ${venue}` : ""}.`,
    statusLabels: profile.statusLabels,
    category: profile.categoryKey,
  };
}

// Central terminology resolver. Returns a flat object of labels for the
// workspace's business category, applying any custom work-label override.
export function getBusinessTerminology(workspace) {
  const category = resolveBusinessCategory(workspace);
  const profile = getProfile(category);
  const base = buildTerminology(profile);

  // Optional custom work-label override (Preferences). Applied only when both
  // singular + plural are provided, to avoid half-overridden labels.
  const sOverride = workspace?.custom_work_label_singular?.trim();
  const pOverride = workspace?.custom_work_label_plural?.trim();
  if (sOverride && pOverride) {
    const s = sOverride;
    const p = pOverride;
    const sl = s.toLowerCase();
    const pl = p.toLowerCase();
    return {
      ...base,
      workItemSingular: s,
      workItemPlural: p,
      createWorkItemLabel: `Create ${s}`,
      editWorkItemLabel: `Edit ${s}`,
      viewWorkItemLabel: `View ${s}`,
      addWorkItemLabel: `Add ${s}`,
      workItemDetailsLabel: `${s} Details`,
      workItemTitleLabel: `${s} Title`,
      activeWorkLabel: `Active ${p}`,
      totalWorkLabel: `Total ${p}`,
      completedWorkLabel: `Completed ${p}`,
      profitabilityLabel: `${s} Profitability`,
      financialSummaryLabel: `${s} Financial Summary`,
      searchPlaceholder: `Search ${pl}...`,
      clientWorkLabel: `Client ${p}`,
      exportPrefix: p,
      emptyTitle: `No ${pl} yet`,
      emptyDescription: `Create your first ${sl} to get started.`,
    };
  }

  return base;
}

// Resolve the display label for an internal Event status value.
export function statusDisplayLabel(workspace, status) {
  const term = getBusinessTerminology(workspace);
  return term.statusLabels[status] || status;
}