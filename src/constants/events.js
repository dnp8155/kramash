// Shared event metadata — preserved from the Phase 1 mock module so existing
// filter/badge UI keeps the same status set and ordering.

// Default event types — used when a workspace has not configured custom types.
// These are NOT hardcoded limits; workspaces can override them via Preferences.
export const defaultEventTypes = [
  "Wedding",
  "Pre-Wedding",
  "Corporate",
  "Birthday",
  "Production",
  "Other",
];

// Default event statuses — used when a workspace has not configured custom statuses.
// Event status is NEVER auto-derived from payments or dates; it is always
// user-controlled via the EventForm status dropdown.
export const defaultEventStatuses = [
  "Confirmed",
  "In Progress",
  "Pending",
  "Cancelled",
  "Completed",
];

// Legacy aliases for backward compatibility with existing imports.
export const eventTypes = defaultEventTypes;
export const eventStatuses = defaultEventStatuses;

// Date-based period filter options for the Events screen.
export const eventPeriods = [
  "Upcoming",
  "Today",
  "This Week",
  "Past",
];