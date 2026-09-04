import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin-only endpoint: toggles the public portal link on/off for a quotation.
// When enabling for the first time, generates a secure random public_token.
// Also supports toggling the "Hide Team Names" visibility setting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { quotation_id, enabled, hide_team_names } = body;
    if (!quotation_id) return Response.json({ error: "Quotation id required" }, { status: 400 });

    // Verify the quotation belongs to the user (RLS check via user-scoped get)
    let q = null;
    try {
      q = await base44.entities.Quotation.get(quotation_id);
    } catch (e) { /* not found */ }
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    const updates = {};

    if (enabled !== undefined) {
      updates.public_link_enabled = !!enabled;
      // Generate a secure token when enabling for the first time
      if (enabled && !q.public_token) {
        updates.public_token = generateSecureToken();
      }
    }

    if (hide_team_names !== undefined) {
      updates.hide_team_names = !!hide_team_names;
    }

    const updated = await base44.entities.Quotation.update(quotation_id, updates);

    return Response.json({
      public_link_enabled: !!updated.public_link_enabled,
      public_token: updated.public_token || "",
      hide_team_names: !!updated.hide_team_names,
      portal_view_count: Number(updated.portal_view_count) || 0,
      portal_first_viewed_at: updated.portal_first_viewed_at || "",
      portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Generate a 48-character hex token using Web Crypto API
function generateSecureToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}