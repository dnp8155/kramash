// supabase/functions/_shared/cors.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400"
};
function withCors(handler) {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders
      });
    }
    const response = await handler(req);
    const existingOrigin = response.headers.get("Access-Control-Allow-Origin");
    if (existingOrigin) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

// supabase/functions/_shared/supabaseClient.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
var supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// supabase/functions/_shared/helpers.ts
function safeJson(v) {
  if (v === null || v === void 0) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// supabase/functions/getPublicInvoice/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });
    const { data: list } = await supabaseAdmin.from("invoices").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(5);
    if (!list || list.length === 0) return Response.json({ error: "Invoice not found" }, { status: 404 });
    const inv = list[0];
    if (!inv.public_link_enabled) return Response.json({ unavailable: true, message: "This invoice link is currently unavailable." });
    if (inv.status === "cancelled") return Response.json({ unavailable: true, message: "This invoice has been cancelled." });
    if (!skipTracking) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const viewCount = (Number(inv.portal_view_count) || 0) + 1;
      const firstViewed = inv.portal_first_viewed_at || now;
      supabaseAdmin.from("invoices").update({ portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).eq("id", inv.id).then(() => {
      }, () => {
      });
    }
    let client = null, business = null, event = null, bankDetails = null, socialLinks = null;
    client = safeJson(inv.client_snapshot);
    business = safeJson(inv.business_snapshot);
    event = safeJson(inv.event_snapshot);
    bankDetails = safeJson(inv.bank_details_snapshot);
    socialLinks = safeJson(inv.social_links_snapshot);
    if (inv.event_id) {
      const { data: liveEvent } = await supabaseAdmin.from("events").select("*").eq("id", inv.event_id).single();
      if (liveEvent) {
        event = event || {};
        event.event_type = liveEvent.event_type || event.event_type || "";
        event.title = liveEvent.title || event.title || "";
        event.venue = liveEvent.venue || event.venue || "";
      }
    }
    const { data: items } = await supabaseAdmin.from("invoice_items").select("*").eq("invoice_id", inv.id).order("sort_order", { ascending: true }).limit(500);
    let currency = "INR";
    const { data: ws } = await supabaseAdmin.from("workspaces").select("currency").eq("id", inv.workspace_id).single();
    if (ws?.currency) currency = ws.currency;
    let payments = [], totalPaid = 0;
    const { data: txns } = await supabaseAdmin.from("financial_transactions").select("*").eq("invoice_id", inv.id).eq("transaction_type", "CLIENT_RECEIPT").eq("status", "ACTIVE").order("transaction_date", { ascending: false }).limit(200);
    payments = (txns || []).map((t) => ({ amount: Number(t.amount) || 0, payment_method: t.payment_method || "", transaction_date: t.transaction_date || "", reference_number: t.reference_number || "" }));
    totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0));
    const grandTotal = Number(inv.grand_total) || 0;
    const balanceDue = round2(Math.max(0, grandTotal - totalPaid));
    let paymentStatus = "unpaid";
    if (balanceDue <= 0 && grandTotal > 0) paymentStatus = "paid";
    else if (totalPaid > 0 && balanceDue > 0) paymentStatus = "partial";
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
        invoice_number: inv.invoice_number || "",
        invoice_date: inv.invoice_date || "",
        due_date: inv.due_date || "",
        milestone_tag: inv.milestone_tag || "",
        invoice_type: inv.invoice_type || "manual",
        status: inv.status || "draft",
        payment_status: paymentStatus,
        is_overdue: isOverdue,
        show_itemized_rates: showItemized,
        subtotal: showItemized ? Number(inv.subtotal) || 0 : 0,
        discount_amount: showItemized ? Number(inv.discount_amount) || 0 : 0,
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
        authorized_signatory: inv.authorized_signatory || "",
        signature_type: inv.signature_type || "none",
        signature_image: inv.signature_image || "",
        signature_color: inv.signature_color || "#000000"
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
}));
