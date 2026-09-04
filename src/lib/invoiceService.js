// Invoice service: workspace-scoped CRUD for invoices + their line items.
// Supports both simple line items and packages with nested events.
// Includes helpers for GST mode, amount-in-words, status derivation, and
// backend function wrappers for quotation conversion, payment recording, and public links.

import { base44 } from "@/api/base44Client";
import { round2, computeTotals } from "@/lib/quotationCalc";

// ---- Numbering (frontend preview — actual generation is server-side) ----

export async function generateInvoiceNumber(workspaceId) {
  if (!workspaceId) return "";
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const list = await base44.entities.Invoice.filter(
    { workspace_id: workspaceId }, "-invoice_number", 500
  );
  let max = 0;
  for (const inv of list || []) {
    const num = String(inv.invoice_number || "");
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// ---- GST Mode Determination ----

// Same state → CGST+SGST; different state → IGST.
export function determineGstMode(businessState, clientState) {
  if (!businessState || !clientState) return "cgst_sgst";
  return businessState.trim().toLowerCase() === clientState.trim().toLowerCase()
    ? "cgst_sgst"
    : "igst";
}

// ---- Amount in Words (Indian numbering system) ----

export function amountToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num) {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num) {
    const h = Math.floor(num / 100);
    const r = num % 100;
    let str = "";
    if (h > 0) str += ones[h] + " Hundred";
    if (r > 0) str += (h > 0 ? " " : "") + twoDigits(r);
    return str;
  }

  function convert(num) {
    if (num === 0) return "";
    const crore = Math.floor(num / 10000000);
    num = num % 10000000;
    const lakh = Math.floor(num / 100000);
    num = num % 100000;
    const thousand = Math.floor(num / 1000);
    num = num % 1000;
    const remainder = num;

    let str = "";
    if (crore > 0) str += convert(crore) + " Crore ";
    if (lakh > 0) str += twoDigits(lakh) + " Lakh ";
    if (thousand > 0) str += twoDigits(thousand) + " Thousand ";
    if (remainder > 0) str += threeDigits(remainder);
    return str.trim();
  }

  return convert(n) + " Only";
}

// ---- Status Derivation ----

export function deriveInvoiceStatus(invoice) {
  const total = Number(invoice?.grand_total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  const balance = round2(Math.max(0, total - paid));
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = invoice?.due_date || "";
  const currentStatus = invoice?.status || "draft";

  if (currentStatus === "cancelled") return "cancelled";
  if (currentStatus === "draft") return "draft";

  if (balance <= 0 && total > 0) return "paid";
  if (paid > 0 && balance > 0) return "partial";

  if (dueDate && dueDate < today) return "overdue";
  return currentStatus === "sent" ? "sent" : "due";
}

// ---- Status Metadata (for UI badges) ----

export const INVOICE_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  due: { label: "Due", className: "bg-badge-progress-bg text-badge-progress-fg" },
  sent: { label: "Sent", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg" },
  partial: { label: "Partial", className: "bg-badge-progress-bg text-badge-progress-fg" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" }
};

// ---- Snapshots (reuse from quotation) ----

export function buildClientSnapshot(client) {
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

export function buildBusinessSnapshot(workspace) {
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

export function buildEventSnapshot(event) {
  if (!event) return "";
  return JSON.stringify({
    title: event.title || "",
    event_type: event.event_type || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    venue: event.venue || "",
    venue_address: event.venue_address || ""
  });
}

// ---- Item helpers ----

export function invoiceLineTotal(item) {
  const qty = Math.max(0, Number(item?.quantity) || 0);
  const rate = Math.max(0, Number(item?.unit_rate) || 0);
  return round2(qty * rate);
}

export function invoiceSubtotal(items) {
  return round2((items || []).reduce((s, it) => s + invoiceLineTotal(it), 0));
}

// Compute invoice totals with a flat GST rate applied to taxable amount.
export function computeInvoiceTotals(items, opts = {}) {
  const subtotal = invoiceSubtotal(items);
  const dType = opts.discountType || "percent";
  const dVal = Math.max(0, Number(opts.discountValue) || 0);
  let discountAmount = 0;
  if (dType === "fixed") {
    discountAmount = round2(Math.min(dVal, subtotal));
  } else {
    const pct = Math.min(Math.max(dVal, 0), 100);
    discountAmount = round2((subtotal * pct) / 100);
  }
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));

  let cgst = 0, sgst = 0, igst = 0, gstTotal = 0;
  if (opts.gstApplicable) {
    const rate = Math.max(0, Number(opts.gstRate) || 0);
    gstTotal = round2((taxableAmount * rate) / 100);
    const mode = opts.gstMode || "cgst_sgst";
    if (mode === "igst") {
      igst = gstTotal;
    } else {
      cgst = round2(gstTotal / 2);
      sgst = round2(gstTotal - cgst);
    }
  }

  const grandTotal = round2(taxableAmount + gstTotal);
  return { subtotal, discountAmount, taxableAmount, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, gstTotal, grandTotal };
}

export function totalsPayload(items, opts) {
  const t = computeInvoiceTotals(items, opts);
  return {
    subtotal: t.subtotal,
    discount_amount: t.discountAmount,
    taxable_amount: t.taxableAmount,
    gst_rate: opts.gstRate || 0,
    cgst_amount: t.cgstAmount,
    sgst_amount: t.sgstAmount,
    igst_amount: t.igstAmount,
    gst_total: t.gstTotal,
    grand_total: t.grandTotal,
    amount_in_words: amountToWords(t.grandTotal)
  };
}

export function toItemPayload(item, workspaceId, invoiceId, sortOrder) {
  return {
    workspace_id: workspaceId,
    invoice_id: invoiceId,
    item_type: item.item_type || "line_item",
    name: item.name || "",
    description: item.description || "",
    deliverables: item.deliverables || "",
    quantity: Math.max(0, Number(item.quantity) || 1),
    unit_rate: round2(Math.max(0, Number(item.unit_rate) || 0)),
    line_total: invoiceLineTotal(item),
    events_json: item.events_json || "",
    sort_order: sortOrder ?? 0
  };
}

// ---- Queries ----

export async function loadInvoices(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.Invoice.filter(
    { workspace_id: workspaceId }, "-invoice_date", 500
  );
  return list || [];
}

export async function loadInvoiceItems(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) return [];
  const list = await base44.entities.InvoiceItem.filter(
    { workspace_id: workspaceId, invoice_id: invoiceId }, "sort_order", 500
  );
  return list || [];
}

export async function loadInvoice(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) return null;
  try {
    const inv = await base44.entities.Invoice.get(invoiceId);
    if (!inv || inv.workspace_id !== workspaceId) return null;
    const items = await loadInvoiceItems(workspaceId, invoiceId);
    return { invoice: inv, items };
  } catch (e) {
    return null;
  }
}

// Load payments (CLIENT_RECEIPT transactions) for an invoice.
export async function loadInvoicePayments(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) return [];
  const list = await base44.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, invoice_id: invoiceId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
    "-transaction_date", 200
  );
  return list || [];
}

// ---- Create / Update ----

export async function createInvoice(workspaceId, data, items, opts = {}) {
  const totals = totalsPayload(items, {
    discountType: data.discount_type,
    discountValue: data.discount_value,
    gstApplicable: data.gst_applicable,
    gstRate: data.gst_rate || 0,
    gstMode: data.gst_mode
  });
  const invoice_number = data.invoice_number || (await generateInvoiceNumber(workspaceId));
  const payload = {
    workspace_id: workspaceId,
    invoice_number,
    quotation_id: data.quotation_id || "",
    client_id: data.client_id || "",
    event_id: data.event_id || "",
    invoice_date: data.invoice_date,
    due_date: data.due_date || "",
    due_date_type: data.due_date_type || "due_on_receipt",
    invoice_type: data.invoice_type || "manual",
    milestone_id: data.milestone_id || "",
    milestone_tag: data.milestone_tag || "Full Payment",
    status: data.status || "draft",
    show_itemized_rates: data.show_itemized_rates !== false,
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    gst_applicable: !!data.gst_applicable,
    gst_rate: Number(data.gst_rate) || 0,
    gst_mode: data.gst_mode || "cgst_sgst",
    payment_schedule_json: data.payment_schedule_json || "",
    notes: data.notes || "",
    payment_terms: data.payment_terms || "",
    terms_and_conditions: data.terms_and_conditions || "",
    authorized_signatory: data.authorized_signatory || "",
    client_snapshot: opts.client_snapshot || "",
    business_snapshot: opts.business_snapshot || "",
    event_snapshot: opts.event_snapshot || "",
    bank_details_snapshot: opts.bank_details_snapshot || "",
    social_links_snapshot: opts.social_links_snapshot || ""
  };
  const inv = await base44.entities.Invoice.create(payload);
  const itemPayloads = (items || []).map((it, i) => toItemPayload(it, workspaceId, inv.id, i));
  if (itemPayloads.length) await base44.entities.InvoiceItem.bulkCreate(itemPayloads);
  return inv;
}

export async function updateInvoice(workspaceId, invoiceId, data, items, opts = {}) {
  const totals = totalsPayload(items, {
    discountType: data.discount_type,
    discountValue: data.discount_value,
    gstApplicable: data.gst_applicable,
    gstRate: data.gst_rate || 0,
    gstMode: data.gst_mode
  });
  const payload = {
    client_id: data.client_id || "",
    event_id: data.event_id || "",
    invoice_date: data.invoice_date,
    due_date: data.due_date || "",
    due_date_type: data.due_date_type || "due_on_receipt",
    milestone_tag: data.milestone_tag || "Full Payment",
    status: data.status || "draft",
    show_itemized_rates: data.show_itemized_rates !== false,
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    gst_applicable: !!data.gst_applicable,
    gst_rate: Number(data.gst_rate) || 0,
    gst_mode: data.gst_mode || "cgst_sgst",
    payment_schedule_json: data.payment_schedule_json || "",
    notes: data.notes || "",
    payment_terms: data.payment_terms || "",
    terms_and_conditions: data.terms_and_conditions || "",
    authorized_signatory: data.authorized_signatory || ""
  };
  if (opts.client_snapshot !== undefined) payload.client_snapshot = opts.client_snapshot;
  if (opts.business_snapshot !== undefined) payload.business_snapshot = opts.business_snapshot;
  if (opts.event_snapshot !== undefined) payload.event_snapshot = opts.event_snapshot;
  if (opts.bank_details_snapshot !== undefined) payload.bank_details_snapshot = opts.bank_details_snapshot;
  if (opts.social_links_snapshot !== undefined) payload.social_links_snapshot = opts.social_links_snapshot;

  const inv = await base44.entities.Invoice.update(invoiceId, payload);

  // Replace items
  const existing = await loadInvoiceItems(workspaceId, invoiceId);
  if (existing.length) {
    await base44.entities.InvoiceItem.deleteMany({ invoice_id: invoiceId, workspace_id: workspaceId });
  }
  const itemPayloads = (items || []).map((it, i) => toItemPayload(it, workspaceId, invoiceId, i));
  if (itemPayloads.length) await base44.entities.InvoiceItem.bulkCreate(itemPayloads);
  return inv;
}

export async function deleteInvoice(workspaceId, invoiceId) {
  await base44.entities.InvoiceItem.deleteMany({ invoice_id: invoiceId, workspace_id: workspaceId });
  return base44.entities.Invoice.delete(invoiceId);
}

// ---- Legacy: Create from quotation (client-side) ----
// Kept for backward compatibility with Quotation.jsx.
// Prefer createInvoiceFromQuotation (backend) for race-condition protection.
export async function createFromQuotation(workspaceId, quotation, quotationItems) {
  // Prevent duplicates: if an invoice already exists for this quotation, return it.
  const existing = await base44.entities.Invoice.filter(
    { workspace_id: workspaceId, quotation_id: quotation.id }, "-invoice_date", 1
  );
  if (existing && existing.length > 0) {
    return existing[0];
  }
  const invoiceNumber = await generateInvoiceNumber(workspaceId);
  const items = (quotationItems || []).map((it) => ({
    item_type: "line_item",
    name: it.name || "",
    description: it.description || "",
    deliverables: it.description || "",
    quantity: Math.max(0, Number(it.quantity) || 1),
    unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0))
  }));
  const data = {
    invoice_number: invoiceNumber,
    quotation_id: quotation.id || "",
    client_id: quotation.client_id || "",
    event_id: quotation.event_id || "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    invoice_type: "full",
    discount_type: quotation.discount_type || "percent",
    discount_value: quotation.discount_value || 0,
    gst_applicable: !!quotation.gst_applicable,
    gst_rate: 0,
    gst_mode: quotation.gst_mode || "cgst_sgst",
    notes: quotation.notes || "",
    payment_terms: quotation.terms_and_conditions || "",
    terms_and_conditions: quotation.terms_and_conditions || ""
  };
  return createInvoice(workspaceId, data, items, {
    client_snapshot: quotation.client_snapshot || "",
    business_snapshot: quotation.business_snapshot || "",
    event_snapshot: quotation.event_snapshot || ""
  });
}

// ---- Backend function wrappers ----

// Create invoice from accepted quotation (full or milestone).
// Calls the createInvoiceFromQuotation backend function for server-side numbering + race protection.
export async function createInvoiceFromQuotation(workspaceId, quotationId, mode, options = {}) {
  return base44.functions.invoke("createInvoiceFromQuotation", {
    workspace_id: workspaceId,
    quotation_id: quotationId,
    mode,
    milestone_id: options.milestone_id || "",
    due_date_type: options.due_date_type || "due_on_receipt",
    due_date: options.due_date || ""
  });
}

// Record a payment against an invoice.
// Calls the recordInvoicePayment backend function for FY linkage + duplicate prevention.
export async function recordInvoicePayment(workspaceId, invoiceId, payment) {
  return base44.functions.invoke("recordInvoicePayment", {
    workspace_id: workspaceId,
    invoice_id: invoiceId,
    amount: payment.amount,
    payment_method: payment.payment_method || "UPI",
    transaction_date: payment.transaction_date,
    reference_number: payment.reference_number || "",
    notes: payment.notes || "",
    financial_year_id: payment.financial_year_id || ""
  });
}

// Toggle public link for an invoice.
export async function toggleInvoicePublicLink(invoiceId, enabled) {
  return base44.functions.invoke("toggleInvoicePublicLink", {
    invoice_id: invoiceId,
    enabled
  });
}

// ---- Refs validation ----

export async function verifyInvoiceRefs(workspaceId, clientId, eventId) {
  if (!workspaceId) return { ok: false, error: "No active workspace." };
  let client = null;
  let event = null;
  if (clientId) {
    try {
      client = await base44.entities.Client.get(clientId);
      if (!client || client.workspace_id !== workspaceId) {
        return { ok: false, error: "Selected client does not belong to your workspace." };
      }
    } catch (e) {
      return { ok: false, error: "Selected client could not be found." };
    }
  }
  if (eventId) {
    try {
      event = await base44.entities.Event.get(eventId);
      if (!event || event.workspace_id !== workspaceId) {
        return { ok: false, error: "Selected event does not belong to your workspace." };
      }
    } catch (e) {
      return { ok: false, error: "Selected event could not be found." };
    }
  }
  return { ok: true, client, event };
}