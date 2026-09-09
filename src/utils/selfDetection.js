// Workspace-scoped SELF detection.
// A Team Member is SELF when their name matches the workspace owner's name
// (case-insensitive, trimmed). This is dynamic — if the owner name changes,
// the match updates automatically on the next workspace resolve.
// Matching is always scoped to the current workspace's owner, never global.

export function isSelfMember(memberName, ownerName) {
  if (!memberName || !ownerName) return false;
  return memberName.trim().toLowerCase() === ownerName.trim().toLowerCase();
}

// Convenience: check if a team member record is SELF given the owner name.
export function isSelfMemberRecord(member, ownerName) {
  if (!member || !ownerName) return false;
  return isSelfMember(member.name, ownerName);
}

// Check if a service assignment's provider is SELF.
// provider_id can be "client" (not self) or a team member id.
export function isSelfProvider(assignment, members, ownerName) {
  if (!assignment || !ownerName) return false;
  if (assignment.provider_id === "client" || !assignment.provider_id) return false;
  const member = members.find((m) => m.id === assignment.provider_id);
  return member ? isSelfMemberRecord(member, ownerName) : false;
}