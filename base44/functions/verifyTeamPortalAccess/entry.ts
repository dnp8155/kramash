import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyPassword } from '../../shared/portalCrypto.ts';

// Public endpoint: a team member opens their unique link (/team-login/<token>),
// enters only a password, and this validates it.
// On success returns a session token (= the access token) + team member identity,
// which the frontend stores in localStorage to reach /team-portal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || !password) {
      return Response.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Look up the team member by access token where access is enabled (service role bypasses RLS).
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
      { portal_access_token: token, portal_access_enabled: true },
      '-created_date', 5
    );

    if (!teamMembers || teamMembers.length === 0) {
      return Response.json({ error: 'This link is no longer active. Please contact your service provider.' }, { status: 404 });
    }

    const teamMember = teamMembers[0];
    const ok = await verifyPassword(String(password), teamMember.portal_password_hash || '');
    if (!ok) {
      return Response.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
    }

    return Response.json({
      success: true,
      session_token: teamMember.portal_access_token,
      team_member_id: teamMember.id,
      workspace_id: teamMember.workspace_id,
      team_member_name: teamMember.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}