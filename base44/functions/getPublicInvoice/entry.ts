import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';
import { round2 } from '../../shared/invoiceHelpers.ts';

// Public, unauthenticated endpoint: returns invoice data for the standalone public invoice URL.
// Looked up by a secure random public_token — never exposes internal IDs.
// Records view tracking (first/latest viewed timestamp + view count).
// Respects show_itemized_rates to hide qty/rate/amount when off.
// Never exposes internal notes, margins, or team payment information.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    // Find invoice by public_token (service role — public, no auth)
    const list = await base44.asServiceRole.entities.Invoice.filter(
      { public_token: token }, "-created_date", 5
    );
    if (!list || list.length === 0) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }
    const inv = list[0];

    // Admin master control — if public link is disabled, show unavailable message
    if (!inv.public_link_enabled) {
      return Response.json({ unavailable: true, message: "This invoice link is currently unavailable." });
    }

    // Do not expose cancelled invoices publicly
    if (inv.status === "cancelled") {
      return Response.json({ unavailable: true, message: "This invoice has been cancelled." });
    }

    // Record view tracking (non-blocking)
    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(inv.portal_view_count) || 0) + 1;
      const firstViewed = inv.portal_first_viewed_at || now;
      waitUntil(
        base44.asServiceRole.entities.Invoice.update(inv.id, {
          portal_view_count: viewCount,
          portal_first_viewed_at: firstViewed,
          portal_latest_viewed_at: now
        }).catch(() => {})
      );
    }

    // Parse snapshots
    let client = null, business = null, event = null, bankDetails = null, socialLinks = null;
    try { client = inv.client_snapshot ? JSON.parse(inv.client_snapshot) : null; } catch (e) {}
    try { business = inv.business_snapshot ? JSON.parse(inv.business_snapshot) : null; } catch (e) {}
    try { event = inv.event_snapshot ? JSON.parse(inv.event_snapshot) : null; } catch (e) {}
    try { bankDetails = inv.bank_details_snapshot ? JSON.parse(inv.bank_details_snapshot) : null; } catch (e) {}
    try { socialLinks = inv.social_links_snapshot ? JSON.parse(inv.social_links_snapshot) : null; } catch (e) {}

    // Get invoice items
    const items = await base44.asServiceRole.entities.InvoiceItem.filter(
      { invoice_id: inv.id }, "sort_order", 500
    );

    // Resolve workspace currency
    let currency = "INR";
    try {
      const ws = await base44.asServiceRole.entities.Workspace.get(inv.workspace_id);
      if (ws?.currency) currency = ws.currency;
    } catch (e) { /* default INR */ }

    // Get payment transactions linked to this invoice
    let payments = [];
    let totalPaid = 0;
    try {
      const txns = await base44.asServiceRole.entities.FinancialTransaction.filter(
        { invoice_id: inv.id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
        "-transaction_date", 200
      );
      payments = (txns || []).map((t) => ({
        amount: Number(t.amount) || 0,
        payment_method: t.payment_method || "",
        transaction_date: t.transaction_date || "",
        reference_number: t.reference_number || ""
      }));
      totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0));
    } catch (e) { /* no transactions */ }

    const grandTotal = Number(inv.grand_total) || 0;
    const balanceDue = round2(Math.max(0, grandTotal - totalPaid));

    // Determine payment status for public display
    let paymentStatus = "unpaid";
    if (balanceDue <= 0 && grandTotal > 0) paymentStatus = "paid";
    else if (totalPaid > 0 && balanceDue > 0) paymentStatus = "partial";

    // Determine if overdue
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = balanceDue > 0 && inv.due_date && inv.due_date < today;

    // Build items for public display — respect show_itemized_rates
    const showItemized = inv.show_itemized_rates !== false;
    const publicItems = (items || []).map((it, i) => {
      const item = {
        item_type: it.item_type || "line_item",
        name: it.name || "",
        description: it.description || "",
        deliverables: it.deliverables || "",
        sort_order: i
      };
      if (showItemized) {
        item.quantity = Math.max(1, Number(it.quantity) || 1);
        item.unit_rate = Number(it.unit_rate) || 0;
        item.line_total = Number(it.line_total) || 0;
      }
      return item;
    });

    return Response.json({
      invoice: {
        invoice_number: inv.invoice_number || "",
        invoice_date: inv.invoice_date || "",
        due_date: inv.due_date || "",
        milestone_tag: inv.milestone_tag || "",
        invoice_type: inv.invoice_type || "manual",
        status: inv.status || "draft",
        payment_status: paymentStatus,
        is_overdue: isOverdue,
        show_itemized_rates: showItemized,
        subtotal: showItemized ? (Number(inv.subtotal) || 0) : 0,
        discount_amount: showItemized ? (Number(inv.discount_amount) || 0) : 0,
        discount_type: inv.discount_type || "percent",
        discount_value: Number(inv.discount_value) || 0,
        gst_applicable: !!inv.gst_applicable,
        gst_rate: Number(inv.gst_rate) || 0,
        gst_mode: inv.gst_mode || "cgst_sgst",
        cgst_amount: Number(inv.cgst_amount) || 0,
        sgst_amount: Number(inv.sgst_amount) || 0,
        igst_amount: Number(inv.igst_amount) || 0,
        gst_total: Number(inv.gst_total) || 0,
        grand_total: grandTotal,
        amount_paid: totalPaid,
        balance_due: balanceDue,
        amount_in_words: inv.amount_in_words || "",
        payment_terms: inv.payment_terms || "",
        terms_and_conditions: inv.terms_and_conditions || "",
        authorized_signatory: inv.authorized_signatory || ""
      },
      items: publicItems,
      client,
      business,
      event,
      bank_details: bankDetails,
      social_links: socialLinks,
      payments,
      currency
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}