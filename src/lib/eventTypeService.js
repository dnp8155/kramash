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

// Normalize: trim + collapse internal whitespace (for case-insensitive dedup)
export function normalizeEventType(str) {
  return String(str || "").trim().replace(/\s+/g, " ");
}

// Merge an existing types array with a new type, deduplicated (case-insensitive).
// Returns a new array with the normalized new type appended if it's not a duplicate.
export function mergeEventTypes(existingTypes, newType) {
  const normalized = normalizeEventType(newType);
  if (!normalized) return existingTypes || [];
  const lower = (existingTypes || []).map((t) => normalizeEventType(t).toLowerCase());
  if (lower.includes(normalized.toLowerCase())) return existingTypes || [];
  return [...(existingTypes || []), normalized];
}

// Build the full list of event types for a workspace: configured + used in events.
// Deduplicated (case-insensitive) and sorted alphabetically.
export function buildAllEventTypes(workspace, category, usedTypes = []) {
  const configured = getEventTypes(workspace, category);
  const all = [...configured];
  const seen = new Set(configured.map((t) => normalizeEventType(t).toLowerCase()));
  for (const t of usedTypes) {
    const n = normalizeEventType(t);
    if (n && !seen.has(n.toLowerCase())) {
      all.push(n);
      seen.add(n.toLowerCase());
    }
  }
  return all.sort((a, b) => a.localeCompare(b));
}

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