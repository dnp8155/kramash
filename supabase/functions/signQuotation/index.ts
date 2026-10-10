import { withCors } from "../_shared/cors.ts";
// signQuotation — Public endpoint: client signs (accepts) a finalized quotation.
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { checkQuotationLinkAccess } from "../_shared/linkAccess.ts";
import { resolvePlanContext } from "../_shared/planEngine.ts";
import { sendPushToUser } from "../_shared/sendPush.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { signature, signed_by_name, consent } = body;
    const token = body.public_token || body.token;

    if (!token) return Response.json({ error: "Quotation token required" }, { status: 400 });
    if (!signature || typeof signature !== "string" || !signature.startsWith("data:image")) {
      return Response.json({ error: "A valid signature is required" }, { status: 400 });
    }
    if (!signed_by_name || !signed_by_name.trim()) return Response.json({ error: "Your name is required to sign" }, { status: 400 });
    if (!consent) return Response.json({ error: "You must agree to the terms before signing" }, { status: 400 });

    const { data: list } = await supabaseAdmin
      .from("quotations")
      .select("*")
      .eq("public_token", token)
      .order("created_at", { ascending: false })
      .limit(5);
    const q = (list && list.length > 0) ? list[0] : null;
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    if (q.quotation_link_enabled === false && !q.public_link_enabled) {
      return Response.json({ error: "This quotation link is not available." }, { status: 403 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (q.valid_until && q.valid_until < todayStr) {
      return Response.json({ error: "This quotation has expired and can no longer be signed." }, { status: 403 });
    }
    if (q.status === "accepted" && q.signed_at) {
      return Response.json({ error: "This quotation has already been signed.", already_signed: true }, { status: 409 });
    }
    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation cannot be signed yet." }, { status: 403 });
    }

    // Only someone who got past the password can sign.
    const denied = await checkQuotationLinkAccess(supabaseAdmin, q, body);
    if (denied) return denied;

    const { data: updated } = await supabaseAdmin
      .from("quotations")
      .update({
        status: "accepted", client_signature: signature,
        signed_by_name: signed_by_name.trim(), signed_at: new Date().toISOString(),
        sync_pending: true
      })
      .eq("id", q.id)
      .select("*")
      .single();

    const { data: ownerWs } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", q.workspace_id).single();
    const ownerId = ownerWs?.owner_user_id;

    // Notify the business owner in-app and via push (if Pro and enabled), respecting Preferences.
    // Best-effort — never block the client's signing confirmation on this.
    try {
      if (ownerId) {
        const { data: ownerProfile } = await supabaseAdmin
          .from("profiles")
          .select("notification_preferences")
          .eq("id", ownerId)
          .single();
        const ownerPrefs = ownerProfile?.notification_preferences || {};
        if (ownerPrefs.in_app !== false && ownerPrefs.quotations !== false) {
          const notifTitle = `Quotation accepted: ${q.project_title || q.quotation_number}`;
          const notifMsg = `${signed_by_name.trim()} signed and accepted quotation ${q.quotation_number}.`;

          await supabaseAdmin.from("notifications").insert({
            workspace_id: q.workspace_id,
            user_id: ownerId,
            type: "quotation_accepted",
            title: notifTitle,
            message: notifMsg,
            related_entity_type: "quotation",
            related_entity_id: q.id,
          });

          if (ownerPrefs.push !== false) {
            const planCtx = await resolvePlanContext(q.workspace_id);
            if (planCtx.limits?.notifications_enabled === true) {
              await sendPushToUser(ownerId, notifTitle, notifMsg, {
                entity_type: "quotation",
                entity_id: q.id,
                url: `/quotation/${q.id}`
              });
            }
          }
        }
      }
    } catch { /* notification is best-effort */ }

    return Response.json({
      ok: true,
      quotation: {
        status: updated.status, signed_by_name: updated.signed_by_name,
        signed_at: updated.signed_at, client_signature: updated.client_signature
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));