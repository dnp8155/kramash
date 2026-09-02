// Resolves workspace-configured event/work types with sensible defaults.
// Event types are stored as a JSON string array on the Workspace entity
// (workspace.event_types). When not configured, category-based defaults are used.

const DEFAULT_PHOTO_EVENT_TYPES = [
  "Wedding", "Pre-Wedding", "Reception", "Engagement", "Haldi",
  "Mehndi", "Birthday", "Corporate", "Portfolio", "Other"
];

const DEFAULT_GENERIC_WORK_TYPES = [
  "Project", "Assignment", "Consultation", "Site Visit", "Contract", "Other"
];

// Returns the workspace's configured event types, or category defaults if none set.
export function getEventTypes(workspace, category) {
  try {
    const parsed = workspace?.event_types ? JSON.parse(workspace.event_types) : null;
    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* fall through to defaults */ }
  return getDefaultEventTypes(category);
}

// Category-based default event types (used when workspace has no custom types configured).
export function getDefaultEventTypes(category) {
  return (category === "ARCHITECTURE" || category === "OTHER")
    ? DEFAULT_GENERIC_WORK_TYPES
    : DEFAULT_PHOTO_EVENT_TYPES;
}