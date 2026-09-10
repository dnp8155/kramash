import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Workspace admin invites a client to the Client Portal.
// Instead of calling inviteUser (which pre-creates the user and blocks self-registration),
// we send a custom email with a registration link that has the client's email pre-filled.
// The client clicks the link → lands on /client-register?email=... → sets password → portal.
// getClientPortalData auto-links them by matching email to a Client record on first login.
//
// If SendEmail to non-registered users is unavailable (no custom domain),
// the registration link is returned so the admin can share it manually.
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

    // Build the registration link with email pre-filled
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    const registerUrl = `${origin}/client-register?email=${encodeURIComponent(email)}`;

    // Fetch workspace + client info for the email content
    let workspace = null;
    let client = null;
    try {
      workspace = await base44.asServiceRole.entities.Workspace.get(workspace_id);
    } catch (e) { /* continue */ }
    try {
      client = await base44.asServiceRole.entities.Client.get(client_id);
    } catch (e) { /* continue */ }

    const workspaceName = workspace?.name || 'your service provider';
    const clientName = client?.name || 'there';

    // Try to send a custom email with the registration link
    let emailSent = false;
    let emailError = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `You're invited to access your project portal — ${workspaceName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #18302D;">Hi ${clientName},</h2>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              <strong>${workspaceName}</strong> has invited you to access your project portal.
              You can view your projects, quotations, invoices, and payment history in one place.
            </p>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Click the button below to set your password and activate your account:
            </p>
            <p style="text-align: center; margin: 32px 0;">
              <a href="${registerUrl}" style="background: #18302D; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Set My Password
              </a>
            </p>
            <p style="font-size: 13px; color: #888;">
              Or copy this link: <br>
              <span style="word-break: break-all;">${registerUrl}</span>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="font-size: 12px; color: #aaa;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `Hi ${clientName}, ${workspaceName} has invited you to access your project portal. Set your password here: ${registerUrl}`
      });
      emailSent = true;
    } catch (e) {
      emailError = e?.message || 'Failed to send email';
    }

    return Response.json({
      success: true,
      email_sent: emailSent,
      email_error: emailError,
      register_url: registerUrl,
      message: emailSent
        ? 'Invitation email sent! The client can click the link to set their password.'
        : 'Email could not be sent automatically. Share the registration link with the client manually.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}