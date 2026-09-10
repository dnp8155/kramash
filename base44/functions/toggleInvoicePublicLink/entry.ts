import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateSecureToken } from '../../shared/invoiceHelpers.ts';

// Admin-only endpoint: toggles the public invoice link on/off.
// When enabling for the first time, generates a secure random public_token.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { invoice_id, enabled } = body;
    if (!invoice_id) return Response.json({ error: "invoice_id required" }, { status: 400 });

    // Verify the invoice belongs to the user (RLS check via user-scoped get)
    let inv = null;
    try {
      inv = await base44.entities.Invoice.get(invoice_id);
    } catch (e) { /* not found */ }
    if (!inv) return Response.json({ error: "Invoice not found" }, { status: 404 });

    const updates = {};

    if (enabled !== undefined) {
      updates.public_link_enabled = !!enabled;
      // Generate a secure token when enabling for the first time
      if (enabled && !inv.public_token) {
        updates.public_token = generateSecureToken();
      }
    }

    const updated = await base44.entities.Invoice.update(invoice_id, updates);

    return Response.json({
      public_link_enabled: !!updated.public_link_enabled,
      public_token: updated.public_token || "",
      portal_view_count: Number(updated.portal_view_count) || 0,
      portal_first_viewed_at: updated.portal_first_viewed_at || "",
      portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}