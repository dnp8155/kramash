// Industry-specific default presets for new workspaces.
// These are starter data only — users can add, edit, disable, or remove them.
// Presets are applied ONLY when a NEW workspace is created, never to existing workspaces.
// Rates are in the workspace currency (default INR).

// ─── Team Role presets ───
export const TEAM_ROLE_PRESETS = {
  PHOTOGRAPHY: [
    { name: "Photographer", default_rate: 5000, rate_type: "Per Event" },
    { name: "Videographer", default_rate: 6000, rate_type: "Per Event" },
    { name: "Drone Operator", default_rate: 7000, rate_type: "Per Event" },
    { name: "Editor", default_rate: 3000, rate_type: "Per Event" },
    { name: "Assistant", default_rate: 2000, rate_type: "Per Event" },
  ],
  EVENT_MANAGEMENT: [
    { name: "Event Coordinator", default_rate: 8000, rate_type: "Per Event" },
    { name: "Decorator", default_rate: 10000, rate_type: "Per Event" },
    { name: "Lighting Technician", default_rate: 5000, rate_type: "Per Event" },
    { name: "Sound Technician", default_rate: 5000, rate_type: "Per Event" },
    { name: "Assistant", default_rate: 2000, rate_type: "Per Event" },
  ],
  ARCHITECTURE: [
    { name: "Architect", default_rate: 25000, rate_type: "Fixed" },
    { name: "Designer", default_rate: 18000, rate_type: "Fixed" },
    { name: "Civil Engineer", default_rate: 20000, rate_type: "Per Day" },
    { name: "Site Supervisor", default_rate: 12000, rate_type: "Per Day" },
    { name: "Draftsman", default_rate: 8000, rate_type: "Fixed" },
  ],
  OTHER: [],
};

// ─── Service presets ───
export const SERVICE_PRESETS = {
  PHOTOGRAPHY: [
    { name: "Photography", default_rate: 30000, rate_type: "Fixed" },
    { name: "Videography", default_rate: 25000, rate_type: "Fixed" },
    { name: "Album", default_rate: 15000, rate_type: "Per Unit" },
  ],
  EVENT_MANAGEMENT: [
    { name: "Event Coordination", default_rate: 15000, rate_type: "Fixed" },
    { name: "Decoration", default_rate: 25000, rate_type: "Fixed" },
    { name: "Lighting", default_rate: 12000, rate_type: "Fixed" },
  ],
  ARCHITECTURE: [
    { name: "Architectural Planning", default_rate: 50000, rate_type: "Fixed" },
    { name: "3D Visualization", default_rate: 20000, rate_type: "Fixed" },
    { name: "Consultation", default_rate: 5000, rate_type: "Fixed" },
  ],
  OTHER: [],
};

// ─── Expense Category presets (shared across all categories) ───
export const EXPENSE_CATEGORY_PRESETS = [
  { name: "Travel" },
  { name: "Hotel" },
  { name: "Equipment Rental" },
  { name: "Album Printing" },
  { name: "Food" },
  { name: "Venue" },
  { name: "Miscellaneous" },
];

// ─── Helper: get presets for a category (returns empty arrays for OTHER) ───
export function getTeamRolePresets(category) {
  return TEAM_ROLE_PRESETS[category] || [];
}

export function getServicePresets(category) {
  return SERVICE_PRESETS[category] || [];
}