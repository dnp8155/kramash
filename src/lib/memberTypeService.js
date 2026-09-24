// Centralized Team Member Type service — single source of truth for type definitions and colors.
// Member records store only the type ID; the type definition (key + label + color) is resolved here.
// Changing a type's color in Preferences automatically updates every UI that renders the type dot.
// Member type presets are sourced from businessTypeProfiles.js.

import { BUSINESS_TYPE_PROFILES, BUSINESS_CATEGORY_KEYS, getProfile } from "@/lib/businessTypeProfiles";

export const MAX_MEMBER_TYPES = 3;

// Default member types (used when workspace has no configured types)
export const DEFAULT_MEMBER_TYPES = [
  { id: "mt1", title: "Bride Side", color: "#c0392b" },
  { id: "mt2", title: "Groom Side", color: "#2980b9" },
  { id: "mt3", title: "Common", color: "#27ae60" },
];

// Predefined color swatches for the type color picker
export const TYPE_COLOR_SWATCHES = [
  { hex: "#c0392b", label: "Red" },
  { hex: "#2980b9", label: "Blue" },
  { hex: "#27ae60", label: "Green" },
  { hex: "#e67e22", label: "Orange" },
  { hex: "#8e44ad", label: "Purple" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#f39c12", label: "Amber" },
  { hex: "#16a085", label: "Teal" },
  { hex: "#2c3e50", label: "Slate" },
  { hex: "#6b7280", label: "Grey" },
];

// Build MEMBER_TYPE_PRESETS from the central profiles.
export const MEMBER_TYPE_PRESETS = Object.fromEntries(
  BUSINESS_CATEGORY_KEYS.map((key) => [key, BUSINESS_TYPE_PROFILES[key].memberTypes])
);

// Parse member types from workspace JSON string
export function getMemberTypes(workspace) {
  if (!workspace?.team_member_types) return DEFAULT_MEMBER_TYPES;
  try {
    const parsed = JSON.parse(workspace.team_member_types);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_MEMBER_TYPES;
  } catch {
    return DEFAULT_MEMBER_TYPES;
  }
}

// Find a member type by ID
export function getMemberTypeById(workspace, typeId) {
  if (!typeId) return null;
  return getMemberTypes(workspace).find((t) => t.id === typeId) || null;
}

// Find a member type by label (title)
export function getMemberTypeByLabel(workspace, label) {
  if (!label) return null;
  return getMemberTypes(workspace).find((t) => t.title === label) || null;
}

// Resolve color for a member type by ID (preferred), then by label (fallback).
// Returns null if not found — callers should treat null as "no dot" (unassigned).
export function getMemberTypeColor(workspace, typeIdOrLabel) {
  if (!typeIdOrLabel) return null;
  const types = getMemberTypes(workspace);
  // Try by ID first (survives label renames)
  const byId = types.find((t) => t.id === typeIdOrLabel);
  if (byId) return byId.color;
  // Try by label (for legacy assignments that only stored the snapshot)
  const byLabel = types.find((t) => t.title === typeIdOrLabel);
  if (byLabel) return byLabel.color;
  return null;
}

// Get the preset member types for a business category
export function getMemberTypePresets(category) {
  return getProfile(category).memberTypes;
}