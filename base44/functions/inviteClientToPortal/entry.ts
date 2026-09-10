import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Workspace admin invites a client to the Client Portal.
// 1. Invites the user via Base44 (role "user" — only accepted value).
// 2. Finds the newly created User by email.
// 3. Updates role to "client" and links to the Client + Workspace records.
// The client receives an invite email to set their password, then logs in at /client-login.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { client_id, workspace_id, email } = body;

    if (!client_id || !workspace_id || !email) {
      return Response.json({ error: 'client_id, workspace_id, and email are required' }, { status: 400 });
    }

    // Verify the caller is an admin (workspace owner)
    if (user.role !== 'admin') {
      return Response.json({ error: 'Only admins can invite clients' }, { status: 403 });
    }

    // 1. Invite the user — Base44 creates a User record and sends an invite email
    try {
      await base44.users.inviteUser(email, 'user');
    } catch (inviteErr) {
      // If already invited/registered, continue — we'll just update the role
      const msg = (inviteErr?.message || '').toLowerCase();
      if (!msg.includes('already') && !msg.includes('exists') && !msg.includes('registered')) {
        throw inviteErr;
      }
    }

    // 2. Find the User by email — try both user-scoped and service-role access.
    //    Retry a few times since the record may not be immediately queryable
    //    right after inviteUser creates it.
    let portalUser = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      // Try user-scoped first (admin is authenticated)
      try {
        const users = await base44.entities.User.filter({ email }, '-created_date', 10);
        if (users && users.length > 0) {
          portalUser = users[0];
          break;
        }
      } catch (e) { /* try service role next */ }

      // Try service-role
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 10);
        if (users && users.length > 0) {
          portalUser = users[0];
          break;
        }
      } catch (e) { /* try again */ }

      // Wait 300ms before retrying
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (!portalUser) {
      return Response.json({
        success: true,
        pending: true,
        message: 'Invitation email sent. The client will be linked to the portal automatically when they log in for the first time.'
      });
    }

    // 3. Update role to "client" and link to Client + Workspace
    await base44.asServiceRole.entities.User.update(portalUser.id, {
      role: 'client',
      linked_client_id: client_id,
      linked_workspace_id: workspace_id
    });

    return Response.json({
      success: true,
      message: 'Client invited to portal. They will receive an email to set their password.',
      user_id: portalUser.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}