import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyWorkspaceMembership } from '../../shared/planEngine.ts';
import { generateAccessToken, generatePassword, hashPassword } from '../../shared/portalCrypto.ts';

// Workspace admin enables (or disables) the password-only portal gate for a client.
// On enable: generates a random access token + random password, stores the hashed
// password + token + enabled flag, and returns the plaintext password ONCE.
// On disable: sets portal_access_enabled = false (password/token are cleared).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { client_id, workspace_id, action } = body;

    if (!client_id || !workspace_id) {
      return Response.json({ error: 'client_id and workspace_id are required' }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) {
      return Response.json({ error: 'Only workspace members can manage portal access' }, { status: 403 });
    }

    // Load the client (service role bypasses RLS) and verify it belongs to this workspace.
    let client = null;
    try {
      client = await base44.asServiceRole.entities.Client.get(client_id);
    } catch (e) { /* not found */ }
    if (!client || client.workspace_id !== workspace_id) {
      return Response.json({ error: 'Client not found in this workspace' }, { status: 404 });
    }

    if (action === 'disable') {
      await base44.asServiceRole.entities.Client.update(client_id, {
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

    await base44.asServiceRole.entities.Client.update(client_id, {
      portal_access_token: accessToken,
      portal_password_hash: passwordHash,
      portal_access_enabled: true
    });

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    const loginUrl = `${origin}/client-login/${accessToken}`;

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