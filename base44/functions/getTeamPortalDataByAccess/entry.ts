import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildTeamPortalData } from '../../shared/teamPortalData.ts';

// Powers the password-only portal path. Validates the session token (issued by
// verifyTeamPortalAccess) against the stored access token + enabled flag,
// then returns the same portal payload shape as getTeamPortalData.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { session_token, team_member_id } = body;

    if (!session_token || !team_member_id) {
      return Response.json({ error: 'Session token and team member id are required' }, { status: 400 });
    }

    let teamMembers = [];
    try {
      teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
        { id: team_member_id, portal_access_token: session_token, portal_access_enabled: true },
        '-created_date', 5
      );
    } catch (e) {
      return Response.json({ error: 'Your portal session is no longer active. Please sign in again.' }, { status: 401 });
    }

    if (!teamMembers || teamMembers.length === 0) {
      return Response.json({ error: 'Your portal session is no longer active. Please sign in again.' }, { status: 401 });
    }

    const teamMember = teamMembers[0];
    const data = await buildTeamPortalData(base44, teamMember.id, teamMember.workspace_id, {
      emailOverride: teamMember.email
    });

    return Response.json({ auto_linked: false, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}