import { base44 } from "@/api/base44Client";

export const INVOICE_STATUS = [
  { key: "draft", label: "Draft", color: "muted" },
  { key: "sent", label: "Sent", color: "blue" },
  { key: "partially_paid", label: "Partially Paid", color: "amber" },
  { key: "paid", label: "Paid", color: "green" },
  { key: "overdue", label: "Overdue", color: "red" },
  { key: "cancelled", label: "Cancelled", color: "muted" }
];

export const statusLabel = (status) => INVOICE_STATUS.find((s) => s.key === status)?.label || status;

export function parseJson(str, fallback = []) {
  if (!str) return fallback;
  try {
    const parsed = JSON.parse(str);
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

export function generateInvoiceNumber(existing = []) {
  const year = new Date().getFullYear();
  const count = (existing || []).filter((inv) => inv.invoice_number?.includes(`INV-${year}`)).length + 1;
  return `INV-${year}-${String(count).padStart(4, "0")}`;
}

export function calcInvoiceTotals(items, discountAmount, gstApplicable, gstRate) {
  const subtotal = (items || []).reduce((sum, item) => {
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.unit_rate) || 0;
    const days = Number(item.days) || 1;
    return sum + qty * rate * days;
  }, 0);
  const discount = Math.min(Number(discountAmount) || 0, subtotal);
  const taxableAmount = subtotal - discount;
  const gstAmount = gstApplicable ? (taxableAmount * (Number(gstRate) || 0)) / 100 : 0;
  return {
    subtotal,
    discount_amount: discount,
    gst_amount: gstAmount,
    grand_total: taxableAmount + gstAmount
  };
}

export async function createInvoice(data) {
  return base44.entities.Invoice.create(data);
}

export async function updateInvoice(id, data) {
  return base44.entities.Invoice.update(id, data);
}

export async function deleteInvoice(id) {
  return base44.entities.Invoice.delete(id);
}

export async function createInvoiceFromQuotation(quotation, quotationItems, workspaceId, existingInvoices) {
  const items = (quotationItems || []).map((qi) => ({
    name: qi.name,
    description: qi.description || "",
    quantity: Number(qi.quantity) || 1,
    days: Number(qi.days) || 1,
    unit_rate: Number(qi.unit_rate) || 0,
    rate_type: qi.rate_type || "Fixed",
    line_total: Number(qi.line_total) || 0
  }));

  const invoiceNumber = generateInvoiceNumber(existingInvoices);
  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const payload = {
    workspace_id: workspaceId,
    invoice_number: invoiceNumber,
    client_id: quotation.client_id || "",
    event_id: quotation.event_id || "",
    quotation_id: quotation.id,
    invoice_date: today,
    due_date: dueDate,
    status: "draft",
    items_json: JSON.stringify(items),
    subtotal: Number(quotation.subtotal) || 0,
    discount_amount: Number(quotation.discount_amount) || 0,
    gst_applicable: quotation.gst_applicable || false,
    gst_amount: Number(quotation.gst_total) || 0,
    grand_total: Number(quotation.grand_total) || 0,
    amount_paid: 0,
    balance_due: Number(quotation.grand_total) || 0,
    client_snapshot: quotation.client_snapshot || "",
    notes: quotation.notes || "",
    terms_and_conditions: quotation.terms_and_conditions || ""
  };

  return base44.entities.Invoice.create(payload);
}

export async function recalcInvoicePaid(invoiceId, workspaceId) {
  const transactions = await base44.entities.FinancialTransaction.filter({
    workspace_id: workspaceId,
    transaction_type: "CLIENT_RECEIPT",
    status: "ACTIVE"
  });
  const paid = transactions
    .filter((t) => t.client_id && t.event_id)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return paid;
}