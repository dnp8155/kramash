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
async function getUserFromRequest(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// supabase/functions/_shared/planEngine.ts
async function verifyWorkspaceMembership(userId, workspaceId) {
  const { data: memberships } = await supabaseAdmin.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", userId).limit(1);
  if (memberships && memberships.length > 0) return true;
  const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_user_id").eq("id", workspaceId).single();
  if (ws && ws.owner_user_id === userId) return true;
  return false;
}

// supabase/functions/_shared/helpers.ts
function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
async function generateInvoiceNumber(supabaseAdmin2, workspaceId) {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabaseAdmin2.from("invoices").select("invoice_number").eq("workspace_id", workspaceId).order("invoice_number", { ascending: false }).limit(500);
  let max = 0;
  for (const inv of data || []) {
    const num = String(inv.invoice_number || "");
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
function determineGstMode(businessState, clientState) {
  if (!businessState || !clientState) return "cgst_sgst";
  return businessState.trim().toLowerCase() === clientState.trim().toLowerCase() ? "cgst_sgst" : "igst";
}
function computeInvoiceTotals(items, opts) {
  const subtotal = round2((items || []).reduce((s, it) => {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const rate = Math.max(0, Number(it.unit_rate) || 0);
    return s + round2(qty * rate);
  }, 0));
  const dType = opts.discountType || "percent";
  const dVal = Math.max(0, Number(opts.discountValue) || 0);
  let discountAmount = 0;
  if (dType === "fixed") {
    discountAmount = round2(Math.min(dVal, subtotal));
  } else {
    const pct = Math.min(Math.max(dVal, 0), 100);
    discountAmount = round2(subtotal * pct / 100);
  }
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));
  let cgst = 0, sgst = 0, igst = 0, gstTotal = 0;
  if (opts.gstApplicable) {
    const rate = Math.max(0, Number(opts.gstRate) || 0);
    gstTotal = round2(taxableAmount * rate / 100);
    const mode = opts.gstMode || "cgst_sgst";
    if (mode === "igst") {
      igst = gstTotal;
    } else {
      cgst = round2(gstTotal / 2);
      sgst = round2(gstTotal - cgst);
    }
  }
  const grandTotal = round2(taxableAmount + gstTotal);
  return {
    subtotal,
    discountAmount,
    taxableAmount,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    gstTotal,
    grandTotal
  };
}
function amountToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero Only";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function twoDigits(num2) {
    if (num2 < 20) return ones[num2];
    return tens[Math.floor(num2 / 10)] + (num2 % 10 ? " " + ones[num2 % 10] : "");
  }
  function threeDigits(num2) {
    const h = Math.floor(num2 / 100);
    const r = num2 % 100;
    let str = "";
    if (h > 0) str += ones[h] + " Hundred";
    if (r > 0) str += (h > 0 ? " " : "") + twoDigits(r);
    return str;
  }
  function convert(num2) {
    if (num2 === 0) return "";
    const crore = Math.floor(num2 / 1e7);
    num2 = num2 % 1e7;
    const lakh = Math.floor(num2 / 1e5);
    num2 = num2 % 1e5;
    const thousand = Math.floor(num2 / 1e3);
    num2 = num2 % 1e3;
    const remainder = num2;
    let str = "";
    if (crore > 0) str += convert(crore) + " Crore ";
    if (lakh > 0) str += twoDigits(lakh) + " Lakh ";
    if (thousand > 0) str += twoDigits(thousand) + " Thousand ";
    if (remainder > 0) str += threeDigits(remainder);
    return str.trim();
  }
  return convert(n) + " Only";
}
function buildClientSnapshot(client) {
  if (!client) return "";
  return JSON.stringify({
    name: client.name || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    city: client.city || "",
    state: client.state || "",
    country: client.country || "",
    gstin: client.gstin || ""
  });
}
function buildBusinessSnapshot(workspace) {
  if (!workspace) return "";
  return JSON.stringify({
    name: workspace.name || "",
    logo: workspace.logo || "",
    address: workspace.address || "",
    city: workspace.city || "",
    state: workspace.state || "",
    country: workspace.country || "",
    phone: workspace.phone || "",
    email: workspace.email || "",
    gst_enabled: !!workspace.gst_enabled,
    gstin: workspace.gstin || "",
    gst_business_name: workspace.gst_business_name || "",
    gst_billing_address: workspace.gst_billing_address || "",
    gst_state: workspace.gst_state || "",
    default_gst_rate: workspace.default_gst_rate ?? 0
  });
}
function buildEventSnapshot(event) {
  if (!event) return "";
  return JSON.stringify({
    title: event.title || "",
    event_type: event.event_type || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    event_dates: Array.isArray(event.event_dates) ? event.event_dates : [],
    venue: event.venue || "",
    venue_address: event.venue_address || ""
  });
}

// supabase/functions/createInvoiceFromQuotation/index.ts
Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { workspace_id, quotation_id, mode, milestone_id, due_date_type, due_date } = body;
    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!quotation_id) return Response.json({ error: "quotation_id required" }, { status: 400 });
    if (!mode || !["full", "milestone"].includes(mode)) {
      return Response.json({ error: "mode must be 'full' or 'milestone'" }, { status: 400 });
    }
    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });
    const { data: q } = await supabaseAdmin.from("quotations").select("*").eq("id", quotation_id).single();
    if (!q || q.workspace_id !== workspace_id) {
      return Response.json({ error: "Quotation not found in this workspace." }, { status: 404 });
    }
    if (!["accepted", "finalized"].includes(q.status)) {
      return Response.json({ error: "Quotation must be accepted or finalized to create an invoice." }, { status: 400 });
    }
    const { data: existingInvoices } = await supabaseAdmin.from("invoices").select("*").eq("workspace_id", workspace_id).eq("quotation_id", quotation_id).neq("status", "cancelled").order("invoice_date", { ascending: false }).limit(100);
    if (mode === "full") {
      const existingFull = (existingInvoices || []).find((inv) => inv.invoice_type === "full" && inv.status !== "cancelled");
      if (existingFull) {
        return Response.json({ error: "DUPLICATE_INVOICE", message: "A full invoice already exists for this quotation.", invoice_id: existingFull.id }, { status: 409 });
      }
    } else if (mode === "milestone") {
      if (!milestone_id) return Response.json({ error: "milestone_id required for milestone mode" }, { status: 400 });
      const existingMilestone = (existingInvoices || []).find((inv) => inv.milestone_id === milestone_id && inv.status !== "cancelled");
      if (existingMilestone) {
        return Response.json({ error: "DUPLICATE_MILESTONE_INVOICE", message: "An invoice already exists for this milestone.", invoice_id: existingMilestone.id }, { status: 409 });
      }
    }
    const { data: quotationItems } = await supabaseAdmin.from("quotation_items").select("*").eq("quotation_id", quotation_id).order("sort_order", { ascending: true }).limit(500);
    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspace_id).single();
    if (!workspace) return Response.json({ error: "Workspace not found." }, { status: 404 });
    let client = null;
    if (q.client_id) {
      const { data: c } = await supabaseAdmin.from("clients").select("*").eq("id", q.client_id).single();
      client = c;
    }
    let event = null;
    if (q.event_id) {
      const { data: e } = await supabaseAdmin.from("events").select("*").eq("id", q.event_id).single();
      event = e;
    }
    const businessState = workspace.gst_state || workspace.state || "";
    const clientState = client?.state || "";
    const gstMode = determineGstMode(businessState, clientState);
    const invoiceNumber = await generateInvoiceNumber(supabaseAdmin, workspace_id);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let calculatedDueDate = due_date || "";
    const ddt = due_date_type || "due_on_receipt";
    if (!calculatedDueDate) {
      if (ddt === "due_on_receipt") calculatedDueDate = today;
      else if (ddt === "net_15") {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() + 15);
        calculatedDueDate = d.toISOString().slice(0, 10);
      } else if (ddt === "net_30") {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() + 30);
        calculatedDueDate = d.toISOString().slice(0, 10);
      }
    }
    let invoiceItems = [];
    let milestoneTag = "Full Payment";
    let milestoneId = "";
    if (mode === "full") {
      const isPackageCategory = ["PHOTOGRAPHY", "EVENT_MANAGEMENT"].includes(q.category);
      if (isPackageCategory) {
        const nonAddonItems = (quotationItems || []).filter((it) => !it.is_addon);
        const addonItems = (quotationItems || []).filter((it) => !!it.is_addon);
        const packageTotal = round2(nonAddonItems.reduce((s, it) => {
          const lt = Number(it.line_total) || Number(it.quantity || 0) * Number(it.unit_rate || 0);
          return s + (lt || 0);
        }, 0));
        const includedNames = nonAddonItems.filter((it) => !["team", "role"].includes(it.item_type)).map((it) => it.name).filter(Boolean);
        const packageDeliverables = includedNames.join("\n");
        const packageDesc = q.project_summary || (includedNames.length > 0 ? includedNames.join("\n") : "");
        const packageName = q.project_title || (q.category === "PHOTOGRAPHY" ? "Photography Package" : "Event Package");
        invoiceItems = [];
        if (nonAddonItems.length > 0) {
          invoiceItems.push({ item_type: "package", name: packageName, description: packageDesc, deliverables: packageDeliverables, quantity: 1, unit_rate: packageTotal });
        }
        for (const addon of addonItems) {
          invoiceItems.push({ item_type: "line_item", name: `${addon.name || "Add-on"} (Add-on)`, description: addon.description || "", deliverables: addon.description || "", quantity: Math.max(1, Number(addon.quantity) || 1), unit_rate: round2(Math.max(0, Number(addon.unit_rate) || 0)) });
        }
      } else {
        invoiceItems = (quotationItems || []).map((it) => ({
          item_type: "line_item",
          name: it.name || "",
          description: it.description || "",
          deliverables: it.description || "",
          quantity: Math.max(1, Number(it.quantity) || 1),
          unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0))
        }));
      }
    } else if (mode === "milestone") {
      const { data: milestone } = await supabaseAdmin.from("payment_milestones").select("*").eq("id", milestone_id).single();
      if (!milestone || milestone.workspace_id !== workspace_id) {
        return Response.json({ error: "Milestone not found in this workspace." }, { status: 404 });
      }
      if (milestone.quotation_id !== quotation_id) {
        return Response.json({ error: "Milestone does not belong to this quotation." }, { status: 400 });
      }
      const dueAmount = round2(Number(milestone.due_amount) || 0);
      if (dueAmount <= 0) return Response.json({ error: "Milestone due amount must be greater than zero." }, { status: 400 });
      const alreadyInvoiced = round2((existingInvoices || []).filter((inv) => inv.invoice_type === "milestone" && inv.status !== "cancelled").reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0));
      const quotationTotal = round2(Number(q.grand_total) || 0);
      const remainingInvoiceable = round2(quotationTotal - alreadyInvoiced);
      if (dueAmount > remainingInvoiceable + 0.01) {
        return Response.json({ error: "Milestone amount exceeds remaining invoiceable value.", remaining: remainingInvoiceable, milestone_amount: dueAmount }, { status: 400 });
      }
      invoiceItems = [{ item_type: "line_item", name: `${milestone.name || "Milestone Payment"} \u2014 ${milestone.description || ""}`.trim(), description: milestone.description || milestone.due_condition || "", deliverables: "", quantity: 1, unit_rate: dueAmount }];
      milestoneTag = milestone.name || "Milestone";
      milestoneId = milestone_id;
    }
    const gstApplicable = !!q.gst_applicable;
    let gstRate = 0;
    if (gstApplicable) {
      const taxable = Number(q.taxable_amount) || 0;
      const gstTotal = Number(q.gst_total) || 0;
      if (taxable > 0 && gstTotal > 0) gstRate = round2(gstTotal / taxable * 100);
      else gstRate = Number(workspace.default_gst_rate) || 18;
    }
    const totals = computeInvoiceTotals(invoiceItems, {
      discountType: mode === "full" ? q.discount_type || "percent" : "percent",
      discountValue: mode === "full" ? q.discount_value || 0 : 0,
      gstApplicable,
      gstRate,
      gstMode
    });
    const amountInWordsStr = amountToWords(totals.grandTotal);
    const { data: invoice, error: invErr } = await supabaseAdmin.from("invoices").insert({
      workspace_id,
      invoice_number: invoiceNumber,
      quotation_id,
      client_id: q.client_id || "",
      event_id: q.event_id || "",
      invoice_date: today,
      due_date: calculatedDueDate,
      due_date_type: ddt,
      invoice_type: mode,
      milestone_id: milestoneId,
      milestone_tag: milestoneTag,
      status: "draft",
      show_itemized_rates: q.show_pricing !== false,
      subtotal: totals.subtotal,
      discount_type: mode === "full" ? q.discount_type || "percent" : "percent",
      discount_value: mode === "full" ? Math.max(0, Number(q.discount_value) || 0) : 0,
      discount_amount: totals.discountAmount,
      taxable_amount: totals.taxableAmount,
      gst_applicable: gstApplicable,
      gst_rate: gstRate,
      gst_mode: gstMode,
      cgst_amount: totals.cgstAmount,
      sgst_amount: totals.sgstAmount,
      igst_amount: totals.igstAmount,
      gst_total: totals.gstTotal,
      grand_total: totals.grandTotal,
      amount_paid: 0,
      balance_due: totals.grandTotal,
      amount_in_words: amountInWordsStr,
      payment_schedule_json: q.payment_schedule_json || "",
      client_snapshot: buildClientSnapshot(client) || q.client_snapshot || "",
      business_snapshot: buildBusinessSnapshot(workspace) || q.business_snapshot || "",
      event_snapshot: buildEventSnapshot(event) || q.event_snapshot || "",
      bank_details_snapshot: q.bank_details_snapshot || "",
      social_links_snapshot: q.social_links_snapshot || "",
      notes: "",
      payment_terms: q.payment_conditions || q.terms_and_conditions || "",
      terms_and_conditions: q.terms_and_conditions || ""
    }).select("*").single();
    if (invErr) throw invErr;
    if (invoiceItems.length > 0) {
      const itemPayloads = invoiceItems.map((it, i) => ({
        workspace_id,
        invoice_id: invoice.id,
        item_type: it.item_type || "line_item",
        name: it.name || "",
        description: it.description || "",
        deliverables: it.deliverables || "",
        quantity: Math.max(0, Number(it.quantity) || 1),
        unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0)),
        line_total: round2(Math.max(0, Number(it.quantity) || 1) * Math.max(0, Number(it.unit_rate) || 0)),
        sort_order: i
      }));
      await supabaseAdmin.from("invoice_items").insert(itemPayloads);
    }
    return Response.json({ success: true, invoice_id: invoice.id, invoice_number: invoiceNumber, grand_total: totals.grandTotal, amount_in_words: amountInWordsStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
