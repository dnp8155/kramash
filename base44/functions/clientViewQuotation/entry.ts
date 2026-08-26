import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public, client-facing quotation view. No auth — anyone with the link can view
// a finalized/accepted quotation. Drafts and rejected quotations are hidden.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const quotationId = body.quotation_id || body.id;
    if (!quotationId) return Response.json({ error: "Quotation id required" }, { status: 400 });

    let q = null;
    try {
      q = await base44.asServiceRole.entities.Quotation.get(quotationId);
    } catch (e) { /* not found */ }
    if (!q) return Response.json({ error: "Quotation not found" }, { status: 404 });

    // Only expose quotations that have been sent to the client.
    if (q.status !== "finalized" && q.status !== "accepted") {
      return Response.json({ error: "This quotation is not available for viewing." }, { status: 403 });
    }

    const items = await base44.asServiceRole.entities.QuotationItem.filter(
      { quotation_id: quotationId },
      "sort_order",
      500
    );

    return Response.json({
      quotation: {
        id: q.id,
        quotation_number: q.quotation_number,
        quotation_date: q.quotation_date,
        valid_until: q.valid_until,
        status: q.status,
        subtotal: q.subtotal || 0,
        discount_amount: q.discount_amount || 0,
        cgst_amount: q.cgst_amount || 0,
        sgst_amount: q.sgst_amount || 0,
        igst_amount: q.igst_amount || 0,
        gst_total: q.gst_total || 0,
        grand_total: q.grand_total || 0,
        gst_applicable: !!q.gst_applicable,
        gst_mode: q.gst_mode || "cgst_sgst",
        terms_and_conditions: q.terms_and_conditions || "",
        notes: q.notes || "",
        client_snapshot: q.client_snapshot || "",
        business_snapshot: q.business_snapshot || "",
        event_snapshot: q.event_snapshot || "",
        client_signature: q.client_signature || "",
        signed_by_name: q.signed_by_name || "",
        signed_at: q.signed_at || ""
      },
      items: (items || []).map((it) => ({
        name: it.name || "",
        description: it.description || "",
        quantity: it.quantity || 0,
        days: it.days || 0,
        unit_rate: it.unit_rate || 0,
        rate_type: it.rate_type || "Fixed",
        line_total: it.line_total || 0,
        gst_rate: it.gst_rate || 0
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}