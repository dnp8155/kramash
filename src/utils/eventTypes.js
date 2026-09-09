// Utility functions for event type normalization and deduplication.
// Used by EventTypeAutocomplete, EventForm, and EventTypeManager to
// prevent duplicate event types (case-insensitive, trimmed).

// Normalize a string for case-insensitive comparison: trim + lowercase.
export function normalizeEventType(type) {
  return (type || "").trim().toLowerCase();
}

// Check if a type already exists in a list (case-insensitive, trimmed).
export function eventTypeExists(type, list) {
  const normalized = normalizeEventType(type);
  if (!normalized) return true; // empty is "exists" (no-op)
  return (list || []).some((t) => normalizeEventType(t) === normalized);
}

// Add a new type to a list if it doesn't already exist (case-insensitive).
// Returns the new list (unchanged if duplicate or empty).
export function addEventType(list, type) {
  const val = (type || "").trim();
  if (!val) return list || [];
  if (eventTypeExists(val, list)) return list || [];
  return [...(list || []), val];
}