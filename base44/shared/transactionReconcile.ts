import { round2, deriveInvoiceStatus } from "./invoiceHelpers.ts";

// Reconciliation helpers — recalculate derived totals (invoice paid/balance/status,
// milestone paid/status) from the single source of truth: FinancialTransaction records.
// Used by recordInvoicePayment, editTransaction, and voidTransaction so that
// create / edit / delete all leave the invoice + milestone in a consistent state.

export function computeMilestoneStatus(paid: number, due: number, dueDate?: string): string {
  if (due <= 0) return "upcoming";
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate && dueDate < today) return "overdue";
  if (dueDate && dueDate <= today) return "due";
  return "upcoming";
}

// Recalculate an invoice's amount_paid, balance_due, and status from its
// linked ACTIVE CLIENT_RECEIPT transactions. Returns the updated invoice or null.
export async function reconcileInvoice(base44: any, workspaceId: string, invoiceId: string) {
  if (!workspaceId || !invoiceId) return null;
  let inv: any = null;
  try {
    inv = await base44.entities.Invoice.get(invoiceId);
  } catch (e) { return null; }
  if (!inv || inv.workspace_id !== workspaceId) return null;

  const txns = await base44.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, invoice_id: invoiceId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
    "-transaction_date", 200
  );
  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const grandTotal = Number(inv.grand_total) || 0;
  const balance = round2(Math.max(0, grandTotal - paid));
  const status = deriveInvoiceStatus({ ...inv, amount_paid: paid });

  return base44.entities.Invoice.update(invoiceId, {
    amount_paid: paid,
    balance_due: balance,
    status
  });
}

// Recalculate a milestone's paid_amount and status from its linked
// ACTIVE CLIENT_RECEIPT transactions. Returns the updated milestone or null.
export async function reconcileMilestone(base44: any, workspaceId: string, milestoneId: string) {
  if (!workspaceId || !milestoneId) return null;
  let m: any = null;
  try {
    m = await base44.entities.PaymentMilestone.get(milestoneId);
  } catch (e) { return null; }
  if (!m || m.workspace_id !== workspaceId) return null;

  const txns = await base44.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, milestone_id: milestoneId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
    "-transaction_date", 200
  );
  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const due = Number(m.due_amount) || 0;
  const status = computeMilestoneStatus(paid, due, m.due_date || "");

  return base44.entities.PaymentMilestone.update(milestoneId, {
    paid_amount: paid,
    status
  });
}

// Reconcile both invoice and milestone (if linked) after a transaction change.
// Safe to call with undefined invoiceId / milestoneId — skips that step.
export async function reconcileAfterTransactionChange(
  base44: any,
  workspaceId: string,
  invoiceId?: string,
  milestoneId?: string
) {
  const results: any = {};
  if (invoiceId) {
    try { results.invoice = await reconcileInvoice(base44, workspaceId, invoiceId); } catch (e) { /* non-critical */ }
  }
  if (milestoneId) {
    try { results.milestone = await reconcileMilestone(base44, workspaceId, milestoneId); } catch (e) { /* non-critical */ }
  }
  return results;
}