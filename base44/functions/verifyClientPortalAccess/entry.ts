import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyPassword } from '../../shared/portalCrypto.ts';

// Public endpoint: a client opens their unique link (/client-login/<token>),
// enters only a password, and this validates it.
// On success returns a session token (= the access token) + client identity,
// which the frontend stores in localStorage to reach /client-portal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || !password) {
      return Response.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Look up the client by access token where access is enabled (service role bypasses RLS).
    const clients = await base44.asServiceRole.entities.Client.filter(
      { portal_access_token: token, portal_access_enabled: true },
      '-created_date', 5
    );

    if (!clients || clients.length === 0) {
      return Response.json({ error: 'This link is no longer active. Please contact your service provider.' }, { status: 404 });
    }

    const client = clients[0];
    const ok = await verifyPassword(String(password), client.portal_password_hash || '');
    if (!ok) {
      return Response.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
    }

    return Response.json({
      success: true,
      session_token: client.portal_access_token,
      client_id: client.id,
      workspace_id: client.workspace_id,
      client_name: client.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}