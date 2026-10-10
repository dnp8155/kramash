// Rate types supported for Team Members and Team Roles.
export const RATE_TYPES = ["Per Event", "Per Day", "Fixed"];

// Team Member status (persisted on the entity).
export const TEAM_MEMBER_STATUS = {
  active: { label: "Active", dot: "bg-[#10b981]" },
  inactive: { label: "Inactive", dot: "bg-[#ef4444]" }
};

// Assignment status (persisted on EventTeamAssignment).
export const ASSIGNMENT_STATUS = {
  assigned: { label: "Assigned", badge: "upcoming" },
  removed: { label: "Removed", badge: "cancelled" }
};

// Availability status (derived, not persisted).
export const AVAILABILITY_STATUS = {
  available: { label: "Available", dot: "bg-[#10b981]" },
  booked: { label: "Booked", dot: "bg-[#f59e0b]" },
  inactive: { label: "Inactive", dot: "bg-[#ef4444]" }
};

// Default roles seeded for a new workspace (if the owner has none yet).
export const DEFAULT_TEAM_ROLES = [
  { name: "Photographer", default_rate: 5000, rate_type: "Per Event" },
  { name: "Cinematographer", default_rate: 6000, rate_type: "Per Event" },
  { name: "Traditional Photographer", default_rate: 4000, rate_type: "Per Event" },
  { name: "Traditional Videographer", default_rate: 4500, rate_type: "Per Event" },
  { name: "Drone Operator", default_rate: 7000, rate_type: "Per Event" },
  { name: "Editor", default_rate: 3000, rate_type: "Per Event" },
  { name: "Assistant", default_rate: 2000, rate_type: "Per Event" },
  { name: "Makeup Artist", default_rate: 5000, rate_type: "Per Event" },
  { name: "Decorator", default_rate: 10000, rate_type: "Per Event" }
];