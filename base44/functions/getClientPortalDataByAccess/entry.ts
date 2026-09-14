import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildClientPortalData } from '../../shared/clientPortalData.ts';

// Powers the password-only portal path. Validates the session token (issued by
// verifyClientPortalAccess) against the stored access token + enabled flag,
// then returns the same portal payload shape as getClientPortalData.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { session_token, client_id } = body;

    if (!session_token || !client_id) {
      return Response.json({ error: 'Session token and client id are required' }, { status: 400 });
    }

    let clients = [];
    try {
      clients = await base44.asServiceRole.entities.Client.filter(
        { id: client_id, portal_access_token: session_token, portal_access_enabled: true },
        '-created_date', 5
      );
    } catch (e) {
      // Invalid id format or query error — treat as no active session.
      return Response.json({ error: 'Your portal session is no longer active. Please sign in again.' }, { status: 401 });
    }

    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Your portal session is no longer active. Please sign in again.' }, { status: 401 });
    }

    const client = clients[0];
    const data = await buildClientPortalData(base44, client.id, client.workspace_id, {
      emailOverride: client.email
    });

    return Response.json({ auto_linked: false, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}