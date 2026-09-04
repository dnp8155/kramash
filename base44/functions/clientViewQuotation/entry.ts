import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public, client-facing quotation view (URL 2). No auth — anyone with the token
// can view a finalized/accepted quotation. Drafts and rejected quotations are hidden.
// Supports lookup by public_token (preferred) or quotation_id (fallback).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const quotationId = body.quotation_id || body.id;

    let q = null;

    // Prefer token-based lookup (does not expose internal IDs)
    if (token) {
      const list = await base44.asServiceRole.entities.Quotation.filter(
        { public_token: token }, "-created_date", 5
      );
      if (list && list.length > 0) q = list[0];
    } else if (quotationId) {
      try { q = await base44.asServiceRole.entities.Quotation.get(quotationId); } catch (e) { /* not found */ }
    } else {
      return Response.json({ error: "Quotation token or id required" }, { status: 400 });
    }

    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    // Only expose quotations that have been sent to the client.
    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation is not available for viewing." }, { status: 403 });
    }

    // If quotation has an access password, validate client credentials.
    if (q.client_access_password) {
      const { email, password } = body;
      if (!password) {
        return Response.json({ requires_auth: true });
      }
      if (password !== q.client_access_password) {
        return Response.json({ error: "Incorrect email or password" }, { status: 401 });
      }
      let clientEmail = "";
      try {
        const snap = JSON.parse(q.client_snapshot || "{}");
        clientEmail = (snap.email || "").trim().toLowerCase();
      } catch (e) { /* ignore */ }
      if (clientEmail && (!email || email.trim().toLowerCase() !== clientEmail)) {
        return Response.json({ error: "Incorrect email or password" }, { status: 401 });
      }
    }

    const items = await base44.asServiceRole.entities.QuotationItem.filter(
      { quotation_id: q.id },
      "sort_order",
      500
    );

    // Resolve workspace currency
    let currency = "INR";
    try {
      const ws = await base44.asServiceRole.entities.Workspace.get(q.workspace_id);
      if (ws?.currency) currency = ws.currency;
    } catch (e) { /* default to INR */ }

    // Server-side expiry check
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const expired = !!(q.valid_until && q.valid_until < todayStr);

    // Parse structured snapshots
    let milestones = [];
    let bankDetails = null;
    let socialLinks = null;
    try { milestones = q.payment_schedule_json ? JSON.parse(q.payment_schedule_json) : []; } catch (e) {}
    try { bankDetails = q.bank_details_snapshot ? JSON.parse(q.bank_details_snapshot) : null; } catch (e) {}
    try { socialLinks = q.social_links_snapshot ? JSON.parse(q.social_links_snapshot) : null; } catch (e) {}

    return Response.json({
      quotation: {
        id: q.id,
        public_token: q.public_token || "",
        quotation_number: q.quotation_number,
        quotation_date: q.quotation_date,
        valid_until: q.valid_until || "",
        status: q.status,
        category: q.category || "",
        context_type: q.context_type || "",
        project_title: q.project_title || "",
        project_summary: q.project_summary || "",
        subtotal: q.subtotal || 0,
        discount_type: q.discount_type || "percent",
        discount_value: q.discount_value || 0,
        discount_amount: q.discount_amount || 0,
        taxable_amount: q.taxable_amount || 0,
        cgst_amount: q.cgst_amount || 0,
        sgst_amount: q.sgst_amount || 0,
        igst_amount: q.igst_amount || 0,
        gst_total: q.gst_total || 0,
        grand_total: q.grand_total || 0,
        gst_applicable: !!q.gst_applicable,
        gst_mode: q.gst_mode || "cgst_sgst",
        show_pricing: q.show_pricing !== false,
        terms_and_conditions: q.terms_and_conditions || "",
        special_notes: q.special_notes || "",
        notes: q.notes || "",
        footer_message: q.footer_message || "",
        client_snapshot: q.client_snapshot || "",
        business_snapshot: q.business_snapshot || "",
        event_snapshot: q.event_snapshot || "",
        bank_details: bankDetails,
        social_links: socialLinks,
        milestones,
        client_signature: q.client_signature || "",
        signed_by_name: q.signed_by_name || "",
        signed_at: q.signed_at || "",
        expired,
        currency
      },
      items: (items || []).map((it) => ({
        item_type: it.item_type || "custom",
        name: it.name || "",
        description: it.description || "",
        quantity: it.quantity || 0,
        days: it.days || 0,
        unit_rate: it.unit_rate || 0,
        rate_type: it.rate_type || "Fixed",
        line_total: it.line_total || 0,
        gst_rate: it.gst_rate || 0,
        sac_code: it.sac_code || "",
        day_date: it.day_date || "",
        phase_title: it.phase_title || "",
        member_type: it.member_type || "",
        team_member_name_snapshot: it.team_member_name_snapshot || "",
        is_addon: !!it.is_addon,
        sort_order: it.sort_order || 0
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}