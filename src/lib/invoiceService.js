// Invoice service: workspace-scoped CRUD for invoices + their line items.
// Supports both simple line items and packages with nested events.
// Includes helpers for GST mode, amount-in-words, status derivation, and
// backend function wrappers for quotation conversion, payment recording, and public links.

import { base44 } from "@/api/base44Client";
import { round2, computeTotals, overrideOrNull } from "@/lib/quotationCalc";
import { formatDate } from "@/lib/dates";

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

// An invoice raised from a quotation carries the quotation's number: QT-2026-0024 -> INV-2026-0024.
// (A revision suffix is dropped.) If that number is already taken — e.g. a second/milestone invoice
// for the same quotation — it gets -2, -3 … so numbers stay unique. Without a quotation number it
// falls back to the next free sequence number.
export async function invoiceNumberForQuotation(workspaceId, quotationNumber) {
  const base = String(quotationNumber || "").trim().replace(/-R\d+$/i, "");
  if (!base) return generateInvoiceNumber(workspaceId);
  const wanted = /^[A-Za-z]+(?=[-_/ ])/.test(base) ? base.replace(/^[A-Za-z]+/, "INV") : `INV-${base}`;
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? wanted : `${wanted}-${n}`;
    const clash = await base44.entities.Invoice.filter({ workspace_id: workspaceId, invoice_number: candidate });
    if (!(clash || []).length) return candidate;
  }
  return generateInvoiceNumber(workspaceId);
}

// "Scope of Work" text for an invoice, built from the quotation the same way the quotation portal lists it:
// day by day, team shown by ROLE (never names — "N × Role" when the quotation hides team names), then
// services and other items. No prices. Add-ons are separate invoice lines, so they're left out.
export function buildScopeText(quotation, quotationItems) {
  const all = (quotationItems || []).filter((it) => !it.is_addon);
  const items = all.filter((it) => it.phase_title !== "__includes__");
  const includeItems = all.filter((it) => it.phase_title === "__includes__");
  const labelOf = (it) => {
    if (it.item_type === "team") return it.description || "Team Member";
    return it.name || it.description || "";
  };
  const days = new Map(); // day_date ("" = undated) -> Map(label -> count)
  for (const it of items) {
    const label = labelOf(it).trim();
    if (!label) continue;
    const key = it.day_date || "";
    if (!days.has(key)) days.set(key, new Map());
    const m = days.get(key);
    m.set(label, (m.get(label) || 0) + Math.max(1, Number(it.quantity) || 1));
  }
  const keys = [...days.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  const dated = keys.filter((k) => k !== "");
  const blocks = keys.map((k) => {
    const lines = [...days.get(k).entries()].map(([label, n]) => `• ${n > 1 ? `${n} × ` : ""}${label}`);
    const heading = k ? `${formatDate(k)}${dated.length > 1 ? ` (Day ${dated.indexOf(k) + 1})` : ""}` : (dated.length ? "Other" : "");
    return heading ? `${heading}\n${lines.join("\n")}` : lines.join("\n");
  });
  const summary = String(quotation?.project_summary || "").trim();
  // Includes / Deliverables (soft copies, edited video…) come after the days, with their quantities.
  const includeLines = includeItems
    .filter((it) => (it.name || "").trim())
    .map((it) => `• ${Number(it.quantity) > 1 ? `${it.quantity} × ` : ""}${it.name.trim()}${String(it.description || "").trim() ? ` — ${String(it.description).trim()}` : ""}`);
  const includesBlock = includeLines.length ? `Includes\n${includeLines.join("\n")}` : "";
  return [summary, blocks.join("\n\n"), includesBlock].filter(Boolean).join("\n\n");
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

// What the client still owes: total minus payments. Always derived from these two, never from a stored
// balance_due, which can be missing/0 on invoices that were created or edited by hand.
export function invoiceBalance(invoice) {
  const total = Number(invoice?.grand_total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  return round2(Math.max(0, total - paid));
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
    tagline: workspace.tagline || "",
    business_type: workspace.business_type || "",
    business_category: workspace.business_category || "",
    team_member_types: workspace.team_member_types || "",
    custom_work_label_singular: workspace.custom_work_label_singular || "",
    custom_work_label_plural: workspace.custom_work_label_plural || "",
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
    default_gst_rate: workspace.default_gst_rate ?? 0,
    date_format: workspace.date_format || "",
    number_format: workspace.number_format || ""
  });
}

export function buildEventSnapshot(event) {
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

// ---- Bank & Social snapshot helpers (mirrors quotation) ----

export function buildBankDetailsSnapshot(bankData) {
  if (!bankData) return "";
  return JSON.stringify({
    account_name: bankData.account_name || "",
    bank_name: bankData.bank_name || "",
    account_number: bankData.account_number || "",
    ifsc: bankData.ifsc || "",
    upi_id: bankData.upi_id || ""
  });
}

export function buildSocialLinksSnapshot(socialData) {
  if (!socialData) return "";
  return JSON.stringify({
    instagram: socialData.instagram || "",
    youtube: socialData.youtube || "",
    website: socialData.website || "",
    twitter: socialData.twitter || socialData.portfolio || "",
    extra: Array.isArray(socialData.extra) ? socialData.extra.slice(0, 2) : []
  });
}

export function parseSnapshot(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch (e) { return null; }
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
  // Manual amount replaces the items' subtotal; discount and GST work off it (see computeTotals).
  const override = overrideOrNull(opts.finalTotal);
  const base = override ?? subtotal;
  const dType = opts.discountType || "percent";
  const dVal = Math.max(0, Number(opts.discountValue) || 0);
  let discountAmount = 0;
  if (dType === "fixed") {
    discountAmount = round2(Math.min(dVal, base));
  } else {
    const pct = Math.min(Math.max(dVal, 0), 100);
    discountAmount = round2((base * pct) / 100);
  }
  const taxableAmount = round2(Math.max(0, base - discountAmount));

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

  const adjustmentAmount = round2(base - subtotal);
  const grandTotal = round2(taxableAmount + gstTotal);
  return { adjustmentAmount, subtotal, discountAmount, taxableAmount, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, gstTotal, grandTotal };
}

export function totalsPayload(items, opts) {
  const t = computeInvoiceTotals(items, opts);
  return {
    subtotal: t.subtotal,
    discount_amount: t.discountAmount,
    adjustment_amount: t.adjustmentAmount,
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
    gstMode: data.gst_mode,
    finalTotal: data.final_total_override
  });
  const invoice_number = data.invoice_number || (await generateInvoiceNumber(workspaceId));
  const payload = {
    workspace_id: workspaceId,
    invoice_number,
    quotation_id: data.quotation_id || "",
    client_id: data.client_id || "",
    event_id: data.event_id || "",
    invoice_date: data.invoice_date,
    due_date: data.due_date || null,
    due_date_type: data.due_date_type || "due_on_receipt",
    invoice_type: data.invoice_type || "manual",
    milestone_id: data.milestone_id || "",
    milestone_tag: data.milestone_tag || "Full Payment",
    status: data.status || "draft",
    show_itemized_rates: data.show_itemized_rates !== false,
    ...totals,
    amount_paid: 0,
    balance_due: totals.grand_total,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    final_total_override: overrideOrNull(data.final_total_override),
    gst_applicable: !!data.gst_applicable,
    gst_rate: Number(data.gst_rate) || 0,
    gst_mode: data.gst_mode || "cgst_sgst",
    payment_schedule_json: data.payment_schedule_json || "",
    notes: data.notes || "",
    payment_terms: data.payment_terms || "",
    terms_and_conditions: data.terms_and_conditions || "",
    authorized_signatory: data.authorized_signatory || "",
    signature_type: data.signature_type || "none",
    signature_image: data.signature_image || "",
    signature_color: data.signature_color || "#000000",
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
    gstMode: data.gst_mode,
    finalTotal: data.final_total_override
  });
  // The number was never written on update, so edits to it were silently lost. Blank keeps the current one.
  const newNumber = String(data.invoice_number || "").trim();
  if (newNumber) {
    const clash = await base44.entities.Invoice.filter({ workspace_id: workspaceId, invoice_number: newNumber });
    if ((clash || []).some((x) => x.id !== invoiceId)) throw new Error(`Invoice number ${newNumber} is already used. Choose a different number.`);
  }
  // The total may have changed, so the balance is re-derived from what has already been paid.
  const current = await base44.entities.Invoice.get(invoiceId);
  const payload = {
    ...(newNumber ? { invoice_number: newNumber } : {}),
    client_id: data.client_id || "",
    event_id: data.event_id || "",
    invoice_date: data.invoice_date,
    due_date: data.due_date || null,
    due_date_type: data.due_date_type || "due_on_receipt",
    milestone_tag: data.milestone_tag || "Full Payment",
    status: data.status || "draft",
    show_itemized_rates: data.show_itemized_rates !== false,
    ...totals,
    balance_due: invoiceBalance({ grand_total: totals.grand_total, amount_paid: current?.amount_paid }),
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    final_total_override: overrideOrNull(data.final_total_override),
    gst_applicable: !!data.gst_applicable,
    gst_rate: Number(data.gst_rate) || 0,
    gst_mode: data.gst_mode || "cgst_sgst",
    payment_schedule_json: data.payment_schedule_json || "",
    notes: data.notes || "",
    payment_terms: data.payment_terms || "",
    terms_and_conditions: data.terms_and_conditions || "",
    authorized_signatory: data.authorized_signatory || "",
    signature_type: data.signature_type || "none",
    signature_image: data.signature_image || "",
    signature_color: data.signature_color || "#000000"
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

// Duplicate an existing invoice: copies all fields + line items with a new number.
// Resets payment tracking (amount_paid=0, balance_due=grand_total, status=draft).
export async function duplicateInvoice(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) throw new Error("Missing invoice to copy.");
  const source = await loadInvoice(workspaceId, invoiceId);
  if (!source?.invoice) throw new Error("Could not load source invoice.");
  const { invoice: src, items: srcItems } = source;
  const newNumber = await generateInvoiceNumber(workspaceId);
  const copyPayload = {
    workspace_id: workspaceId,
    invoice_number: newNumber,
    quotation_id: "",
    client_id: src.client_id || "",
    event_id: src.event_id || "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: src.due_date || null,
    due_date_type: src.due_date_type || "due_on_receipt",
    invoice_type: src.invoice_type || "manual",
    milestone_id: "",
    milestone_tag: src.milestone_tag || "Full Payment",
    status: "draft",
    show_itemized_rates: src.show_itemized_rates !== false,
    subtotal: src.subtotal || 0,
    discount_type: src.discount_type || "percent",
    discount_value: src.discount_value || 0,
    discount_amount: src.discount_amount || 0,
    final_total_override: src.final_total_override ?? null,
    adjustment_amount: src.adjustment_amount || 0,
    taxable_amount: src.taxable_amount || 0,
    gst_applicable: !!src.gst_applicable,
    gst_rate: src.gst_rate || 0,
    gst_mode: src.gst_mode || "cgst_sgst",
    cgst_amount: src.cgst_amount || 0,
    sgst_amount: src.sgst_amount || 0,
    igst_amount: src.igst_amount || 0,
    gst_total: src.gst_total || 0,
    grand_total: src.grand_total || 0,
    amount_paid: 0,
    balance_due: src.grand_total || 0,
    amount_in_words: src.amount_in_words || "",
    payment_schedule_json: src.payment_schedule_json || "",
    client_snapshot: src.client_snapshot || "",
    business_snapshot: src.business_snapshot || "",
    event_snapshot: src.event_snapshot || "",
    bank_details_snapshot: src.bank_details_snapshot || "",
    social_links_snapshot: src.social_links_snapshot || "",
    authorized_signatory: src.authorized_signatory || "",
    notes: src.notes || "",
    payment_terms: src.payment_terms || "",
    terms_and_conditions: src.terms_and_conditions || ""
  };
  const newInv = await base44.entities.Invoice.create(copyPayload);
  const itemPayloads = (srcItems || []).map((it, i) => toItemPayload(it, workspaceId, newInv.id, i));
  if (itemPayloads.length) await base44.entities.InvoiceItem.bulkCreate(itemPayloads);
  return newInv;
}

// Due date for an invoice created today. null (not "") when there is none — the column is a DATE.
function dueDateFor(type, custom) {
  const d = new Date();
  if (type === "custom") return custom || null;
  if (type === "net_15") d.setDate(d.getDate() + 15);
  else if (type === "net_30") d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ---- Legacy: Create from quotation (client-side) ----
// Kept for backward compatibility with Quotation.jsx.
// Prefer createInvoiceFromQuotation (backend) for race-condition protection.
// opts.forceNew skips that check (the caller already did a duplicate check that ignores cancelled invoices).
// opts.milestone ({ id, name, amount }) makes a milestone invoice for just that amount; opts.dueDateType /
// opts.dueDate set the due date. Without opts it is the full invoice and an existing one is returned as-is.
export async function createFromQuotation(workspaceId, quotation, quotationItems, opts = {}) {
  const milestone = opts.milestone || null;
  if (!milestone && !opts.forceNew) {
    // Prevent duplicates: if an invoice already exists for this quotation, return it.
    const existing = await base44.entities.Invoice.filter(
      { workspace_id: workspaceId, quotation_id: quotation.id }, "-invoice_date", 1
    );
    if (existing && existing.length > 0) {
      return existing[0];
    }
  }
  const invoiceNumber = await invoiceNumberForQuotation(workspaceId, quotation.quotation_number);
  // BUSINESS RULE: Photography / Event Management → package/lump-sum invoice.
  // Internal team/role items never become client-facing invoice line items.
  const isPackageCategory = ["PHOTOGRAPHY", "EVENT_MANAGEMENT"].includes(quotation.category);
  let items;
  if (milestone) {
    items = [{
      item_type: "line_item",
      name: milestone.name || "Milestone Payment",
      description: milestone.description || "",
      deliverables: "",
      quantity: 1,
      unit_rate: round2(Math.max(0, Number(milestone.amount) || 0))
    }];
  } else if (isPackageCategory) {
    const nonAddonItems = (quotationItems || []).filter((it) => !it.is_addon);
    const addonItems = (quotationItems || []).filter((it) => !!it.is_addon);
    const packageTotal = round2(nonAddonItems.reduce((s, it) => {
      const lt = Number(it.line_total) || (Number(it.quantity || 0) * Number(it.unit_rate || 0));
      return s + (lt || 0);
    }, 0));
    const includedNames = nonAddonItems
      .filter((it) => !["team", "role"].includes(it.item_type))
      .map((it) => it.name)
      .filter(Boolean);
    const packageName = quotation.project_title
      || (quotation.category === "PHOTOGRAPHY" ? "Photography Package" : "Event Package");
    items = [];
    if (nonAddonItems.length > 0) {
      items.push({
        item_type: "package",
        name: packageName,
        description: buildScopeText(quotation, quotationItems) || quotation.project_summary || includedNames.join("\n"),
        deliverables: includedNames.join("\n"),
        quantity: 1,
        unit_rate: packageTotal
      });
    }
    for (const addon of addonItems) {
      items.push({
        item_type: "line_item",
        name: `${addon.name || "Add-on"} (Add-on)`,
        description: addon.description || "",
        deliverables: addon.description || "",
        quantity: Math.max(1, Number(addon.quantity) || 1),
        unit_rate: round2(Math.max(0, Number(addon.unit_rate) || 0))
      });
    }
  } else {
    items = (quotationItems || []).map((it) => ({
      item_type: "line_item",
      name: it.name || "",
      description: it.description || "",
      deliverables: it.description || "",
      quantity: Math.max(0, Number(it.quantity) || 1),
      unit_rate: round2(Math.max(0, Number(it.unit_rate) || 0))
    }));
  }
  const gstApplicable = !!quotation.gst_applicable;
  let gstRate = 0;
  if (gstApplicable) {
    const taxable = Number(quotation.taxable_amount) || 0;
    const gstTotal = Number(quotation.gst_total) || 0;
    if (taxable > 0 && gstTotal > 0) {
      gstRate = round2((gstTotal / taxable) * 100);
    }
  }
  const dueDateType = opts.dueDateType || "due_on_receipt";
  const dueDate = dueDateFor(dueDateType, opts.dueDate);
  const data = {
    invoice_number: invoiceNumber,
    quotation_id: quotation.id || "",
    client_id: quotation.client_id || "",
    event_id: quotation.event_id || "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: dueDate,
    due_date_type: dueDateType,
    status: "draft",
    invoice_type: milestone ? "milestone" : "full",
    milestone_id: milestone?.id || "",
    milestone_tag: milestone ? "Custom" : "Full Payment",
    discount_type: quotation.discount_type || "percent",
    discount_value: milestone ? 0 : (quotation.discount_value || 0),
    final_total_override: milestone ? null : (quotation.final_total_override ?? null),
    gst_applicable: gstApplicable,
    gst_rate: gstRate,
    gst_mode: quotation.gst_mode || "cgst_sgst",
    notes: quotation.notes || "",
    payment_terms: quotation.payment_conditions || quotation.terms_and_conditions || "",
    terms_and_conditions: quotation.terms_and_conditions || ""
  };
  return createInvoice(workspaceId, data, items, {
    client_snapshot: quotation.client_snapshot || "",
    business_snapshot: quotation.business_snapshot || "",
    event_snapshot: quotation.event_snapshot || "",
    bank_details_snapshot: quotation.bank_details_snapshot || "",
    social_links_snapshot: quotation.social_links_snapshot || ""
  });
}

// ---- Client-side wrappers (replaces Edge Functions not deployed on Supabase) ----

import { recordInvoicePayment as recordInvPayment, toggleInvoicePublicLinkFn } from "@/lib/clientEdgeFunctions";

// Create invoice from a finalized/accepted quotation (full or milestone).
// Resolves to { invoice_id, invoice_number, ... } or { error, message, invoice_id? } for a duplicate.
export async function createInvoiceFromQuotation(workspaceId, quotationId, mode, options = {}) {
  const quotation = await base44.entities.Quotation.get(quotationId);
  if (!quotation || quotation.workspace_id !== workspaceId) throw new Error("Quotation not found in this workspace.");
  if (!["accepted", "finalized"].includes(quotation.status)) {
    throw new Error("Finalize or accept the quotation before creating an invoice.");
  }
  const items = await base44.entities.QuotationItem.filter({ workspace_id: workspaceId, quotation_id: quotationId }, "sort_order", 500);
  const existing = (await base44.entities.Invoice.filter(
    { workspace_id: workspaceId, quotation_id: quotationId }, "-invoice_date", 100
  ) || []).filter((inv) => inv.status !== "cancelled");

  const done = (inv) => ({ success: true, invoice_id: inv.id, invoice_number: inv.invoice_number, grand_total: inv.grand_total });
  const due = { dueDateType: options.due_date_type, dueDate: options.due_date };

  if (mode !== "milestone") {
    const full = existing.find((inv) => inv.invoice_type === "full");
    if (full) return { error: "DUPLICATE_INVOICE", message: "A full invoice already exists for this quotation.", invoice_id: full.id };
    // A full invoice would double-bill anything already invoiced by milestone.
    if (existing.some((inv) => inv.invoice_type === "milestone")) {
      return { error: "Milestone invoices already exist for this quotation, so a full invoice would double-bill it." };
    }
    return done(await createFromQuotation(workspaceId, quotation, items, { ...due, forceNew: true }));
  }

  let schedule = [];
  try { schedule = JSON.parse(quotation.payment_schedule_json || "[]"); } catch { /* none */ }
  const index = String(options.milestone_id || "").startsWith("ms_") ? Number(String(options.milestone_id).slice(3)) : -1;
  const synced = await base44.entities.PaymentMilestone.filter({ workspace_id: workspaceId, quotation_id: quotationId }, "sort_order", 200);
  const row = index >= 0 ? schedule[index] : null;
  const pm = (synced || []).find((m) => m.id === options.milestone_id) || (row ? (synced || []).find((m) => m.name === row.name) : null);
  const name = pm?.name || row?.name;
  if (!name) throw new Error("Milestone not found on this quotation.");
  const grandTotal = Number(quotation.grand_total) || 0;
  const value = Math.max(0, Number(row?.value) || 0);
  const amount = round2(pm ? Number(pm.due_amount) || 0 : (row?.type === "fixed" ? value : (grandTotal * value) / 100));
  if (amount <= 0) throw new Error("Milestone amount must be greater than zero.");

  const milestoneId = pm?.id || "";
  if (existing.some((inv) => inv.invoice_type === "milestone" && (milestoneId ? inv.milestone_id === milestoneId : false))) {
    return { error: "DUPLICATE_MILESTONE_INVOICE", message: "An invoice already exists for this milestone." };
  }
  if (existing.some((inv) => inv.invoice_type === "full")) {
    return { error: "A full invoice already exists for this quotation, so a milestone invoice would double-bill it." };
  }
  const inv = await createFromQuotation(workspaceId, quotation, items, {
    ...due, milestone: { id: milestoneId, name, description: row?.due_condition || pm?.due_condition || "", amount }
  });
  return done(inv);
}

// Record a payment against an invoice (client-side).
export async function recordInvoicePayment(workspaceId, invoiceId, payment) {
  return recordInvPayment({
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

// Toggle public link for an invoice (client-side).
export async function toggleInvoicePublicLink(invoiceId, enabled) {
  return toggleInvoicePublicLinkFn(invoiceId, enabled);
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