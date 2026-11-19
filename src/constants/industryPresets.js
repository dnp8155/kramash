// Industry-specific starter presets for new workspaces.
// Applied ONLY on new workspace creation (never force-applied to existing
// workspaces or on category change). All presets are editable/removable by
// the user after seeding.
// Profiles are defined in businessTypeProfiles.js — this module exposes
// them in the legacy { roles, services } shape expected by Onboarding.

import { BUSINESS_TYPE_PROFILES, BUSINESS_CATEGORY_KEYS, getProfile } from "@/lib/businessTypeProfiles";

// Build the legacy INDUSTRY_PRESETS shape from the central profiles.
export const INDUSTRY_PRESETS = Object.fromEntries(
  BUSINESS_CATEGORY_KEYS.map((key) => {
    const p = BUSINESS_TYPE_PROFILES[key];
    return [key, { roles: p.roles, services: p.services }];
  })
);

// Return the presets for a category (empty arrays for OTHER / unknown).
export function getIndustryPresets(category) {
  const p = getProfile(category);
  return { roles: p.roles, services: p.services };
}