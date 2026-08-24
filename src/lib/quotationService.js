// Phase 6 quotation service: workspace-scoped queries, unique numbering,
// snapshot capture, and CRUD for quotations + their line items.

import { base44 } from "@/api/base44Client";
import { round2, lineTotal, computeTotals } from "@/lib/quotationCalc";

// ---- Services ----

export async function loadServices(workspaceId, { includeInactive = false } = {}) {
  if (!workspaceId) return [];
  const list = await base44.entities.Service.filter(
    { workspace_id: workspaceId }, "name", 200
  );
  let res = list || [];
  if (!includeInactive) res = res.filter((s) => s.status === "active");
  return res;
}

export async function loadAllServices(workspaceId) {
  return loadServices(workspaceId, { includeInactive: true });
}

// ---- Quotation numbering ----

// Generate a unique sequential quotation number: QT-YYYY-NNNN
export async function generateQuotationNumber(workspaceId) {
  if (!workspaceId) return "";
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const list = await base44.entities.Quotation.filter(
    { workspace_id: workspaceId }, "-quotation_number", 500
  );
  let max = 0;
  for (const q of list || []) {
    const num = String(q.quotation_number || "");
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

// ---- Snapshots ----

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

export function parseSnapshot(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// ---- Item payload helpers ----

// Normalize an estimator/quotation line item into a QuotationItem payload.
export function toItemPayload(item, workspaceId, quotationId, sortOrder) {
  return {
    workspace_id: workspaceId,
    quotation_id: quotationId,
    item_type: item.item_type || "custom",
    reference_id: item.reference_id || "",
    name: item.name || "",
    description: item.description || "",
    quantity: Math.max(0, Number(item.quantity) || 0),
    days: Math.max(0, Number(item.days) || 0) || (item.rate_type === "Per Day" ? 1 : 1),
    unit_rate: round2(Math.max(0, Number(item.unit_rate) || 0)),
    rate_type: item.rate_type || "Fixed",
    line_total: lineTotal(item),
    gst_rate: Math.max(0, Number(item.gst_rate) || 0),
    sac_code: item.sac_code || "",
    sort_order: sortOrder ?? 0
  };
}

// ---- Totals payload ----

export function totalsPayload(items, opts) {
  const t = computeTotals(items, opts);
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

// ---- Queries ----

export async function loadQuotations(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.Quotation.filter(
    { workspace_id: workspaceId }, "-quotation_date", 500
  );
  return list || [];
}

export async function loadQuotationItems(workspaceId, quotationId) {
  if (!workspaceId || !quotationId) return [];
  const list = await base44.entities.QuotationItem.filter(
    { workspace_id: workspaceId, quotation_id: quotationId }, "sort_order", 500
  );
  return list || [];
}

// Load a quotation with its items. Returns null if not found or not in workspace.
export async function loadQuotation(workspaceId, quotationId) {
  if (!workspaceId || !quotationId) return null;
  try {
    const q = await base44.entities.Quotation.get(quotationId);
    if (!q || q.workspace_id !== workspaceId) return null;
    const items = await loadQuotationItems(workspaceId, quotationId);
    return { quotation: q, items };
  } catch (e) {
    return null;
  }
}

// ---- Create / Update ----

export async function createQuotation(workspaceId, data, items, opts = {}) {
  const totals = totalsPayload(items, {
    discountType: data.discount_type,
    discountValue: data.discount_value,
    gstApplicable: data.gst_applicable,
    gstMode: data.gst_mode
  });
  const quotation_number = data.quotation_number || (await generateQuotationNumber(workspaceId));
  const payload = {
    workspace_id: workspaceId,
    quotation_number,
    client_id: data.client_id || "",
    event_id: data.event_id || "",
    quotation_date: data.quotation_date,
    valid_until: data.valid_until || "",
    status: data.status || "draft",
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    gst_applicable: !!data.gst_applicable,
    gst_mode: data.gst_mode || "cgst_sgst",
    terms_and_conditions: data.terms_and_conditions || "",
    notes: data.notes || "",
    client_snapshot: opts.client_snapshot || "",
    business_snapshot: opts.business_snapshot || "",
    event_snapshot: opts.event_snapshot || ""
  };
  const q = await base44.entities.Quotation.create(payload);
  const itemPayloads = (items || []).map((it, i) => toItemPayload(it, workspaceId, q.id, i));
  if (itemPayloads.length) await base44.entities.QuotationItem.bulkCreate(itemPayloads);
  return q;
}

export async function updateQuotation(workspaceId, quotationId, data, items, opts = {}) {
  const totals = totalsPayload(items, {
    discountType: data.discount_type,
    discountValue: data.discount_value,
    gstApplicable: data.gst_applicable,
    gstMode: data.gst_mode
  });
  const payload = {
    client_id: data.client_id || "",
    event_id: data.event_id || "",
    quotation_date: data.quotation_date,
    valid_until: data.valid_until || "",
    status: data.status || "draft",
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    gst_applicable: !!data.gst_applicable,
    gst_mode: data.gst_mode || "cgst_sgst",
    terms_and_conditions: data.terms_and_conditions || "",
    notes: data.notes || ""
  };
  // Snapshots: only (re)capture when explicitly provided (e.g. on finalize).
  if (opts.client_snapshot !== undefined) payload.client_snapshot = opts.client_snapshot;
  if (opts.business_snapshot !== undefined) payload.business_snapshot = opts.business_snapshot;
  if (opts.event_snapshot !== undefined) payload.event_snapshot = opts.event_snapshot;

  const q = await base44.entities.Quotation.update(quotationId, payload);

  // Replace items: delete existing, create new.
  const existing = await loadQuotationItems(workspaceId, quotationId);
  if (existing.length) {
    await base44.entities.QuotationItem.deleteMany({ quotation_id: quotationId, workspace_id: workspaceId });
  }
  const itemPayloads = (items || []).map((it, i) => toItemPayload(it, workspaceId, quotationId, i));
  if (itemPayloads.length) await base44.entities.QuotationItem.bulkCreate(itemPayloads);
  return q;
}

// ---- Duplicate ----

export async function duplicateQuotation(workspaceId, sourceQuotation, sourceItems) {
  const newNumber = await generateQuotationNumber(workspaceId);
  const data = {
    quotation_number: newNumber,
    client_id: sourceQuotation.client_id || "",
    event_id: sourceQuotation.event_id || "",
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_until: sourceQuotation.valid_until || "",
    status: "draft",
    discount_type: sourceQuotation.discount_type || "percent",
    discount_value: sourceQuotation.discount_value || 0,
    gst_applicable: !!sourceQuotation.gst_applicable,
    gst_mode: sourceQuotation.gst_mode || "cgst_sgst",
    terms_and_conditions: sourceQuotation.terms_and_conditions || "",
    notes: sourceQuotation.notes || ""
  };
  // Strip ids so items are fresh copies.
  const items = (sourceItems || []).map((it) => ({
    item_type: it.item_type,
    reference_id: it.reference_id,
    name: it.name,
    description: it.description,
    quantity: it.quantity,
    days: it.days,
    unit_rate: it.unit_rate,
    rate_type: it.rate_type,
    gst_rate: it.gst_rate,
    sac_code: it.sac_code
  }));
  return createQuotation(workspaceId, data, items);
}

// ---- Status transitions ----

export async function finalizeQuotation(workspaceId, quotationId, data, items, snapshots) {
  return updateQuotation(workspaceId, quotationId, { ...data, status: "finalized" }, items, {
    client_snapshot: snapshots.client_snapshot,
    business_snapshot: snapshots.business_snapshot,
    event_snapshot: snapshots.event_snapshot
  });
}

// Accept quotation and optionally update the linked event's contract value.
// Returns { quotation, eventUpdated, previousContractValue }.
export async function acceptQuotation(workspaceId, quotationId, { updateContractValue = true } = {}) {
  const q = await base44.entities.Quotation.update(quotationId, { status: "accepted" });
  let eventUpdated = false;
  let previousContractValue = null;
  if (updateContractValue && q.event_id) {
    try {
      const ev = await base44.entities.Event.get(q.event_id);
      if (ev && ev.workspace_id === workspaceId) {
        previousContractValue = Number(ev.contract_value) || 0;
        await base44.entities.Event.update(ev.id, { contract_value: q.grand_total });
        eventUpdated = true;
      }
    } catch (e) {
      /* non-fatal */
    }
  }
  return { quotation: q, eventUpdated, previousContractValue };
}

export async function setStatus(workspaceId, quotationId, status) {
  return base44.entities.Quotation.update(quotationId, { status });
}

export async function deleteQuotation(workspaceId, quotationId) {
  await base44.entities.QuotationItem.deleteMany({ quotation_id: quotationId, workspace_id: workspaceId });
  return base44.entities.Quotation.delete(quotationId);
}

// ---- Relationship security ----

// Validate client + event belong to workspace and are linked.
export async function verifyQuotationRefs(workspaceId, clientId, eventId) {
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
      if (clientId && event.client_id !== clientId) {
        return { ok: false, error: "Selected event does not belong to the selected client." };
      }
    } catch (e) {
      return { ok: false, error: "Selected event could not be found." };
    }
  }
  return { ok: true, client, event };
}

// ---- Default services seeding ----

export async function ensureDefaultServices(workspaceId) {
  if (!workspaceId) return 0;
  const existing = await base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 50);
  if (existing && existing.length > 0) return 0;
  const { DEFAULT_SERVICES } = await import("@/constants/quotationConfig");
  const created = await base44.entities.Service.bulkCreate(
    DEFAULT_SERVICES.map((s) => ({ ...s, workspace_id: workspaceId, status: "active" }))
  );
  return Array.isArray(created) ? created.length : 0;
}