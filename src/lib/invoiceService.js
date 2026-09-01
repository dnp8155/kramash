// Invoice service: workspace-scoped CRUD for invoices + their line items.
// Supports both simple line items and packages with nested events.

import { base44 } from "@/api/base44Client";
import { round2, computeTotals } from "@/lib/quotationCalc";

// ---- Numbering ----

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

// ---- Snapshots (reuse from quotation) ----

export function buildClientSnapshot(client) {
  if (!client) return "";
  return JSON.stringify({
    name: client.name || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    city: client.city || "",
    state: client.state || ""
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
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    venue: event.venue || "",
    venue_address: event.venue_address || ""
  });
}

// ---- Item helpers ----

// Line total for invoice items: quantity x unit_rate (packages are fixed price).
export function invoiceLineTotal(item) {
  const qty = Math.max(0, Number(item?.quantity) || 0);
  const rate = Math.max(0, Number(item?.unit_rate) || 0);
  return round2(qty * rate);
}

export function invoiceSubtotal(items) {
  return round2((items || []).reduce((s, it) => s + invoiceLineTotal(it), 0));
}

// Compute invoice totals using the same engine as quotations.
// Items use a flat rate (no per-item gst_rate in simplified invoice).
export function computeInvoiceTotals(items, opts = {}) {
  // Build pseudo-items compatible with computeTotals (which expects quantity x days x unit_rate).
  const pseudoItems = (items || []).map((it) => ({
    quantity: Math.max(0, Number(it.quantity) || 0),
    days: 1,
    unit_rate: Math.max(0, Number(it.unit_rate) || 0),
    rate_type: "Fixed",
    gst_rate: opts.gstApplicable ? (opts.gstRate || 0) : 0
  }));
  return computeTotals(pseudoItems, {
    discountType: opts.discountType || "percent",
    discountValue: opts.discountValue || 0,
    gstApplicable: opts.gstApplicable,
    gstMode: opts.gstMode || "cgst_sgst"
  });
}

export function totalsPayload(items, opts) {
  const t = computeInvoiceTotals(items, opts);
  return {
    subtotal: t.subtotal,
    discount_amount: t.discountAmount,
    taxable_amount: t.taxableAmount,
    cgst_amount: t.cgstAmount,
    sgst_amount: t.sgstAmount,
    igst_amount: t.igstAmount,
    gst_total: t.gstTotal,
    grand_total: t.grandTotal
  };
}

export function toItemPayload(item, workspaceId, invoiceId, sortOrder) {
  return {
    workspace_id: workspaceId,
    invoice_id: invoiceId,
    item_type: item.item_type || "line_item",
    name: item.name || "",
    description: item.description || "",
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
    status: data.status || "draft",
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    gst_applicable: !!data.gst_applicable,
    gst_mode: data.gst_mode || "cgst_sgst",
    payment_schedule_json: data.payment_schedule_json || "",
    notes: data.notes || "",
    terms_and_conditions: data.terms_and_conditions || "",
    client_snapshot: opts.client_snapshot || "",
    business_snapshot: opts.business_snapshot || "",
    event_snapshot: opts.event_snapshot || ""
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
    status: data.status || "draft",
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    gst_applicable: !!data.gst_applicable,
    gst_mode: data.gst_mode || "cgst_sgst",
    payment_schedule_json: data.payment_schedule_json || "",
    notes: data.notes || "",
    terms_and_conditions: data.terms_and_conditions || ""
  };
  if (opts.client_snapshot !== undefined) payload.client_snapshot = opts.client_snapshot;
  if (opts.business_snapshot !== undefined) payload.business_snapshot = opts.business_snapshot;
  if (opts.event_snapshot !== undefined) payload.event_snapshot = opts.event_snapshot;

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

// ---- Create from accepted quotation ----

export async function createFromQuotation(workspaceId, quotation, quotationItems) {
  const invoiceNumber = await generateInvoiceNumber(workspaceId);
  // Convert quotation items into invoice items (flatten into line_items).
  const items = (quotationItems || []).map((it) => ({
    item_type: "line_item",
    name: it.name || "",
    description: it.description || "",
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
    discount_type: quotation.discount_type || "percent",
    discount_value: quotation.discount_value || 0,
    gst_applicable: !!quotation.gst_applicable,
    gst_mode: quotation.gst_mode || "cgst_sgst",
    notes: quotation.notes || "",
    terms_and_conditions: quotation.terms_and_conditions || ""
  };
  return createInvoice(workspaceId, data, items, {
    client_snapshot: quotation.client_snapshot || "",
    business_snapshot: quotation.business_snapshot || "",
    event_snapshot: quotation.event_snapshot || ""
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