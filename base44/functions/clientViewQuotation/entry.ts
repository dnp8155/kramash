// clientViewQuotation — Public client-facing quotation view with view tracking.
// Ported from supabase/functions/clientViewQuotation — uses Supabase admin client.
import { getSupabaseAdmin } from "../../shared/supabaseAdmin.js";
import { safeJson } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;

    if (!token) return Response.json({ error: "Quotation token required" }, { status: 400 });

    const { data: list } = await supabaseAdmin
      .from("quotations")
      .select("*")
      .eq("public_token", token)
      .order("created_at", { ascending: false })
      .limit(5);
    const q = (list && list.length > 0) ? list[0] : null;
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation is not available for viewing." }, { status: 403 });
    }

    if (q.client_access_password) {
      const { email, password } = body;
      if (!password) return Response.json({ requires_auth: true });
      if (password !== q.client_access_password) {
        return Response.json({ error: "Incorrect email or password" }, { status: 401 });
      }
      let clientEmail = "";
      const snap = safeJson(q.client_snapshot) || {}; clientEmail = (snap.email || "").trim().toLowerCase();
      if (clientEmail && (!email || email.trim().toLowerCase() !== clientEmail)) {
        return Response.json({ error: "Incorrect email or password" }, { status: 401 });
      }
    }

    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(q.portal_view_count) || 0) + 1;
      const firstViewed = q.portal_first_viewed_at || now;
      supabaseAdmin
        .from("quotations")
        .update({ portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now })
        .eq("id", q.id)
        .then(() => {}, () => {});
    }

    const { data: items } = await supabaseAdmin
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", q.id)
      .order("sort_order", { ascending: true })
      .limit(500);

    let currency = "INR";
    const { data: ws } = await supabaseAdmin.from("workspaces").select("currency").eq("id", q.workspace_id).single();
    if (ws?.currency) currency = ws.currency;

    const todayStr = new Date().toISOString().slice(0, 10);
    const expired = !!(q.valid_until && q.valid_until < todayStr);

    let milestones = safeJson(q.payment_schedule_json) || [];
    let bankDetails = safeJson(q.bank_details_snapshot);
    let socialLinks = safeJson(q.social_links_snapshot);

    return Response.json({
      quotation: {
        id: q.id, public_token: q.public_token || "", quotation_number: q.quotation_number,
        quotation_date: q.quotation_date, valid_until: q.valid_until || "", status: q.status,
        category: q.category || "", context_type: q.context_type || "",
        project_title: q.project_title || "", project_summary: q.project_summary || "",
        subtotal: q.subtotal || 0, discount_type: q.discount_type || "percent",
        discount_value: q.discount_value || 0, discount_amount: q.discount_amount || 0,
        taxable_amount: q.taxable_amount || 0, cgst_amount: q.cgst_amount || 0,
        sgst_amount: q.sgst_amount || 0, igst_amount: q.igst_amount || 0,
        gst_total: q.gst_total || 0, grand_total: q.grand_total || 0,
        gst_applicable: !!q.gst_applicable, gst_mode: q.gst_mode || "cgst_sgst",
        show_pricing: q.show_pricing !== false, terms_and_conditions: q.terms_and_conditions || "",
        special_notes: q.special_notes || "", footer_message: q.footer_message || "",
        client_snapshot: q.client_snapshot || "", business_snapshot: q.business_snapshot || "",
        event_snapshot: q.event_snapshot || "", bank_details: bankDetails, social_links: socialLinks,
        milestones, client_signature: q.client_signature || "", signed_by_name: q.signed_by_name || "",
        signed_at: q.signed_at || "", expired, currency
      },
      items: (items || []).map((it) => ({
        item_type: it.item_type || "custom", name: it.name || "", description: it.description || "",
        quantity: it.quantity || 0, days: it.days || 0, unit_rate: it.unit_rate || 0,
        rate_type: it.rate_type || "Fixed", line_total: it.line_total || 0,
        gst_rate: it.gst_rate || 0, sac_code: it.sac_code || "", day_date: it.day_date || "",
        phase_title: it.phase_title || "", member_type: it.member_type || "",
        team_member_name_snapshot: it.team_member_name_snapshot || "", is_addon: !!it.is_addon,
        sort_order: it.sort_order || 0
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}