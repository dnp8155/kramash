import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyWorkspaceMembership } from '../../shared/planEngine.ts';
import { generateAccessToken, generatePassword, hashPassword } from '../../shared/portalCrypto.ts';

// Workspace admin enables (or disables) the password-only portal gate for a team member.
// Self members (workspace owner's own roster entry) are NOT allowed to enable portal access.
// On enable: generates a random access token + random password, stores the hashed
// password + token + enabled flag, and returns the plaintext password ONCE.
// On disable: sets portal_access_enabled = false (password/token are cleared).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { team_member_id, workspace_id, action } = body;

    if (!team_member_id || !workspace_id) {
      return Response.json({ error: 'team_member_id and workspace_id are required' }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: 'Only workspace members can manage portal access' }, { status: 403 });
    }

    // Load the team member (service role bypasses RLS) and verify it belongs to this workspace.
    let teamMember = null;
    try {
      teamMember = await base44.asServiceRole.entities.TeamMember.get(team_member_id);
    } catch (e) { /* not found */ }
    if (!teamMember || teamMember.workspace_id !== workspace_id) {
      return Response.json({ error: 'Team member not found in this workspace' }, { status: 404 });
    }

    // Self members cannot have portal access
    if (teamMember.is_self) {
      return Response.json({ error: 'Portal access is not available for the workspace owner' }, { status: 400 });
    }

    if (action === 'disable') {
      await base44.asServiceRole.entities.TeamMember.update(team_member_id, {
        portal_access_enabled: false,
        portal_password_hash: '',
        portal_access_token: ''
      });
      return Response.json({ success: true, enabled: false });
    }

    // Enable: generate token + password, hash, persist.
    const accessToken = generateAccessToken();
    const password = generatePassword();
    const passwordHash = await hashPassword(password);

    await base44.asServiceRole.entities.TeamMember.update(team_member_id, {
      portal_access_token: accessToken,
      portal_password_hash: passwordHash,
      portal_access_enabled: true
    });

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    const loginUrl = `${origin}/team-login/${accessToken}`;

    return Response.json({
      success: true,
      enabled: true,
      password, // plaintext — returned ONCE for the admin to share
      login_url: loginUrl,
      access_token: accessToken
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}