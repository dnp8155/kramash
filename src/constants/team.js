export const rateTypes = ["Per Event", "Per Day", "Fixed"];
export const teamMemberStatuses = ["Active", "Inactive"];
export const teamRoleStatuses = ["active", "inactive"];
export const assignmentStatuses = ["Assigned", "Removed"];

// Suggested defaults offered when a workspace has no roles yet.
export const defaultTeamRoles = [
  { name: "Photographer", default_rate: 5000, rate_type: "Per Event" },
  { name: "Cinematographer", default_rate: 6000, rate_type: "Per Event" },
  { name: "Traditional Photographer", default_rate: 3000, rate_type: "Per Event" },
  { name: "Traditional Videographer", default_rate: 3500, rate_type: "Per Event" },
  { name: "Drone Operator", default_rate: 7000, rate_type: "Per Event" },
  { name: "Editor", default_rate: 4000, rate_type: "Per Event" },
  { name: "Assistant", default_rate: 2000, rate_type: "Per Event" },
  { name: "Makeup Artist", default_rate: 8000, rate_type: "Per Event" },
  { name: "Decorator", default_rate: 10000, rate_type: "Per Event" },
];