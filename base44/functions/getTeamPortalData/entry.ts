import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildTeamPortalData } from '../../shared/teamPortalData.ts';

// Authenticated endpoint for team_member-role users (invited via email).
// Returns all assignments, payments, and schedule for the logged-in team member.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve linked team member + workspace
    let teamMemberId = user.linked_team_member_id || '';
    let workspaceId = user.linked_workspace_id || '';
    let wasAutoLinked = false;

    // If the user is not yet role "team_member", try to auto-link by email.
    // This handles the case where inviteUser created the user with role "user".
    if (user.role !== 'team_member' || !teamMemberId) {
      const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ email: user.email }, '-created_date', 10);
      // Only link to non-self members (self = workspace owner, who should not use this portal)
      const match = (teamMembers || []).find((m) => !m.is_self);
      if (match) {
        teamMemberId = match.id;
        workspaceId = match.workspace_id || workspaceId;

        try {
          await base44.asServiceRole.entities.User.update(user.id, {
            role: 'team_member',
            linked_team_member_id: teamMemberId,
            linked_workspace_id: workspaceId
          });
          wasAutoLinked = true;
        } catch (e) {
          // If we can't update the role, continue anyway — we have the link
        }
      }
    }

    if (!teamMemberId || !workspaceId) {
      return Response.json({
        error: 'Your account is not linked to any team member record. Please contact your service provider to invite you to the portal.'
      }, { status: 404 });
    }

    const data = await buildTeamPortalData(base44, teamMemberId, workspaceId, {
      emailOverride: user.email,
      memberNameFallback: user.full_name || user.email
    });

    return Response.json({ auto_linked: wasAutoLinked, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}