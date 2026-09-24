import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { safeJson, round2 } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const list = await base44.asServiceRole.entities.Invoice.filter({ public_token: token }, "-created_date", 5);
    if (!list || list.length === 0) return Response.json({ error: "Invoice not found" }, { status: 404 });
    const inv = list[0];

    if (!inv.public_link_enabled) return Response.json({ unavailable: true, message: "This invoice link is currently unavailable." });
    if (inv.status === "cancelled") return Response.json({ unavailable: true, message: "This invoice has been cancelled." });

    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(inv.portal_view_count) || 0) + 1;
      const firstViewed = inv.portal_first_viewed_at || now;
      base44.asServiceRole.entities.Invoice.update(inv.id, { portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).catch(() => {});
    }

    let client = safeJson(inv.client_snapshot);
    let business = safeJson(inv.business_snapshot);
    let event = safeJson(inv.event_snapshot);
    let bankDetails = safeJson(inv.bank_details_snapshot);
    let socialLinks = safeJson(inv.social_links_snapshot);

    if (inv.event_id) {
      try {
        const liveEvent = await base44.asServiceRole.entities.Event.get(inv.event_id);
        if (liveEvent) {
          event = event || {};
          event.event_type = liveEvent.event_type || event.event_type || "";
          event.title = liveEvent.title || event.title || "";
          event.venue = liveEvent.venue || event.venue || "";
        }
      } catch {}
    }

    const items = await base44.asServiceRole.entities.InvoiceItem.filter({ invoice_id: inv.id }, "sort_order", 500);

    let currency = "INR";
    try {
      const ws = await base44.asServiceRole.entities.Workspace.get(inv.workspace_id);
      if (ws?.currency) currency = ws.currency;
    } catch {}

    const txns = await base44.asServiceRole.entities.FinancialTransaction.filter(
      { invoice_id: inv.id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
      "-transaction_date", 200
    );
    const payments = (txns || []).map((t) => ({ amount: Number(t.amount) || 0, payment_method: t.payment_method || "", transaction_date: t.transaction_date || "", reference_number: t.reference_number || "" }));
    const totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0));

    const grandTotal = Number(inv.grand_total) || 0;
    const balanceDue = round2(Math.max(0, grandTotal - totalPaid));

    let paymentStatus = "unpaid";
    if (balanceDue <= 0 && grandTotal > 0) paymentStatus = "paid";
    else if (totalPaid > 0 && balanceDue > 0) paymentStatus = "partial";

    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = balanceDue > 0 && inv.due_date && inv.due_date < today;

    const showItemized = inv.show_itemized_rates !== false;
    const publicItems = (items || []).map((it, i) => {
      const item = { item_type: it.item_type || "line_item", name: it.name || "", description: it.description || "", deliverables: it.deliverables || "", sort_order: i };
      if (showItemized) {
        item.quantity = Math.max(1, Number(it.quantity) || 1);
        item.unit_rate = Number(it.unit_rate) || 0;
        item.line_total = Number(it.line_total) || 0;
      }
      return item;
    });

    return Response.json({
      invoice: {
        invoice_number: inv.invoice_number || "", invoice_date: inv.invoice_date || "", due_date: inv.due_date || "",
        milestone_tag: inv.milestone_tag || "", invoice_type: inv.invoice_type || "manual", status: inv.status || "draft",
        payment_status: paymentStatus, is_overdue: isOverdue, show_itemized_rates: showItemized,
        subtotal: showItemized ? (Number(inv.subtotal) || 0) : 0, discount_amount: showItemized ? (Number(inv.discount_amount) || 0) : 0,
        discount_type: inv.discount_type || "percent", discount_value: Number(inv.discount_value) || 0,
        gst_applicable: !!inv.gst_applicable, gst_rate: Number(inv.gst_rate) || 0, gst_mode: inv.gst_mode || "cgst_sgst",
        cgst_amount: Number(inv.cgst_amount) || 0, sgst_amount: Number(inv.sgst_amount) || 0, igst_amount: Number(inv.igst_amount) || 0,
        gst_total: Number(inv.gst_total) || 0, grand_total: grandTotal, amount_paid: totalPaid, balance_due: balanceDue,
        amount_in_words: inv.amount_in_words || "", payment_terms: inv.payment_terms || "",
        terms_and_conditions: inv.terms_and_conditions || "", authorized_signatory: inv.authorized_signatory || "",
        signature_type: inv.signature_type || "none", signature_image: inv.signature_image || "", signature_color: inv.signature_color || "#000000"
      },
      items: publicItems, client, business, event, bank_details: bankDetails, social_links: socialLinks, payments, currency
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}