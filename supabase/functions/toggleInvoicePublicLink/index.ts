// toggleInvoicePublicLink — Admin toggle for invoice public link.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { generateSecureToken } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { invoice_id, enabled } = body;
    if (!invoice_id) return Response.json({ error: "invoice_id required" }, { status: 400 });

    const { data: inv } = await supabaseAdmin.from("invoices").select("*").eq("id", invoice_id).single();
    if (!inv) return Response.json({ error: "Invoice not found" }, { status: 404 });

    const updates: any = {};
    if (enabled !== undefined) {
      updates.public_link_enabled = !!enabled;
      if (enabled && !inv.public_token) updates.public_token = generateSecureToken();
    }

    const { data: updated } = await supabaseAdmin.from("invoices").update(updates).eq("id", invoice_id).select("*").single();

    return Response.json({
      public_link_enabled: !!updated.public_link_enabled, public_token: updated.public_token || "",
      portal_view_count: Number(updated.portal_view_count) || 0,
      portal_first_viewed_at: updated.portal_first_viewed_at || "",
      portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});