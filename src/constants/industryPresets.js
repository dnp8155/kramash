// Industry-specific default presets for new workspaces.
// These are starter data only — users can add, edit, disable, or remove them.
// Presets are applied ONLY when a NEW workspace is created, never to existing workspaces.

// ─── Team Role presets ───
export const TEAM_ROLE_PRESETS = {
  PHOTOGRAPHY: [
    { name: "Photographer", default_rate: null, rate_type: "Per Event" },
    { name: "Videographer", default_rate: null, rate_type: "Per Event" },
    { name: "Drone Operator", default_rate: null, rate_type: "Per Event" },
    { name: "Editor", default_rate: null, rate_type: "Fixed" },
    { name: "Assistant", default_rate: null, rate_type: "Per Event" },
  ],
  EVENT_MANAGEMENT: [
    { name: "Event Coordinator", default_rate: null, rate_type: "Per Event" },
    { name: "Decorator", default_rate: null, rate_type: "Per Event" },
    { name: "Lighting Technician", default_rate: null, rate_type: "Per Event" },
    { name: "Sound Technician", default_rate: null, rate_type: "Per Event" },
    { name: "Assistant", default_rate: null, rate_type: "Per Event" },
  ],
  ARCHITECTURE: [
    { name: "Architect", default_rate: null, rate_type: "Fixed" },
    { name: "Designer", default_rate: null, rate_type: "Fixed" },
    { name: "Civil Engineer", default_rate: null, rate_type: "Per Day" },
    { name: "Site Supervisor", default_rate: null, rate_type: "Per Day" },
    { name: "Draftsman", default_rate: null, rate_type: "Fixed" },
  ],
  OTHER: [],
};

// ─── Service presets ───
export const SERVICE_PRESETS = {
  PHOTOGRAPHY: [
    { name: "Photography", default_rate: null, rate_type: "Fixed" },
    { name: "Videography", default_rate: null, rate_type: "Fixed" },
    { name: "Drone Coverage", default_rate: null, rate_type: "Fixed" },
    { name: "Album", default_rate: null, rate_type: "Fixed" },
    { name: "Editing", default_rate: null, rate_type: "Fixed" },
  ],
  EVENT_MANAGEMENT: [
    { name: "Event Coordination", default_rate: null, rate_type: "Fixed" },
    { name: "Decoration", default_rate: null, rate_type: "Fixed" },
    { name: "Lighting", default_rate: null, rate_type: "Fixed" },
    { name: "Sound", default_rate: null, rate_type: "Fixed" },
    { name: "Setup", default_rate: null, rate_type: "Fixed" },
  ],
  ARCHITECTURE: [
    { name: "Architectural Planning", default_rate: null, rate_type: "Fixed" },
    { name: "Site Visit", default_rate: null, rate_type: "Per Day" },
    { name: "3D Visualization", default_rate: null, rate_type: "Fixed" },
    { name: "Interior Design", default_rate: null, rate_type: "Fixed" },
    { name: "Consultation", default_rate: null, rate_type: "Fixed" },
  ],
  OTHER: [],
};

// ─── Expense Category presets (shared across all categories) ───
export const EXPENSE_CATEGORY_PRESETS = [
  { name: "Travel" },
  { name: "Equipment Rental" },
  { name: "Materials" },
  { name: "Miscellaneous" },
];

// ─── Helper: get presets for a category (returns empty arrays for OTHER) ───
export function getTeamRolePresets(category) {
  return TEAM_ROLE_PRESETS[category] || [];
}

export function getServicePresets(category) {
  return SERVICE_PRESETS[category] || [];
}