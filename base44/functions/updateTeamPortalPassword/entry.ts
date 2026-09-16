import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyWorkspaceMembership } from '../../shared/planEngine.ts';
import { generatePassword, hashPassword } from '../../shared/portalCrypto.ts';

// Workspace admin changes a team member's portal password.
// If auto_generate is true (or no password is provided), a new random password
// is generated. The new plaintext password is returned ONCE.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { team_member_id, workspace_id, password, auto_generate } = body;

    if (!team_member_id || !workspace_id) {
      return Response.json({ error: 'team_member_id and workspace_id are required' }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: 'Only workspace members can manage portal access' }, { status: 403 });
    }

    let teamMember = null;
    try {
      teamMember = await base44.asServiceRole.entities.TeamMember.get(team_member_id);
    } catch (e) { /* not found */ }
    if (!teamMember || teamMember.workspace_id !== workspace_id) {
      return Response.json({ error: 'Team member not found in this workspace' }, { status: 404 });
    }
    if (teamMember.is_self) {
      return Response.json({ error: 'Portal access is not available for the workspace owner' }, { status: 400 });
    }
    if (!teamMember.portal_access_enabled) {
      return Response.json({ error: 'Portal access is not enabled for this team member' }, { status: 400 });
    }

    const newPassword = (auto_generate || !password) ? generatePassword() : String(password).trim();
    if (newPassword.length < 4) {
      return Response.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);

    await base44.asServiceRole.entities.TeamMember.update(team_member_id, {
      portal_password_hash: passwordHash
    });

    return Response.json({ success: true, password: newPassword });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}