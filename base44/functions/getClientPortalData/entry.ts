import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildClientPortalData } from '../../shared/clientPortalData.ts';

// Authenticated endpoint for client-role users (invited via email).
// Returns all events, quotations, invoices, and payment history for the logged-in client.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve linked client + workspace
    let clientId = user.linked_client_id || '';
    let workspaceId = user.linked_workspace_id || '';
    let wasAutoLinked = false;

    // If the user is not yet role "client", try to auto-link by email.
    // This handles the case where inviteUser created the user with role "user"
    // and the inviteClientToPortal function couldn't update the role immediately.
    if (user.role !== 'client' || !clientId) {
      const clients = await base44.asServiceRole.entities.Client.filter({ email: user.email }, '-created_date', 10);
      if (clients && clients.length > 0) {
        clientId = clients[0].id;
        workspaceId = clients[0].workspace_id || workspaceId;

        // Upgrade the user's role to "client" and persist the link
        try {
          await base44.asServiceRole.entities.User.update(user.id, {
            role: 'client',
            linked_client_id: clientId,
            linked_workspace_id: workspaceId
          });
          wasAutoLinked = true;
        } catch (e) {
          // If we can't update the role, continue anyway — we have the client link
        }
      }
    }

    if (!clientId || !workspaceId) {
      return Response.json({
        error: 'Your account is not linked to any client record. Please contact your service provider to invite you to the portal.'
      }, { status: 404 });
    }

    const data = await buildClientPortalData(base44, clientId, workspaceId, {
      emailOverride: user.email,
      clientNameFallback: user.full_name || user.email
    });

    return Response.json({ auto_linked: wasAutoLinked, ...data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}