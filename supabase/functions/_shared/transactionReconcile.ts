// Transaction reconciliation — recalculate invoice + milestone derived totals
// from the single source of truth: FinancialTransaction records.

import { supabaseAdmin } from "./supabaseClient.ts";
import { round2, deriveInvoiceStatus } from "./helpers.ts";

export function computeMilestoneStatus(paid: number, due: number, dueDate?: string): string {
  if (due <= 0) return "upcoming";
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate && dueDate < today) return "overdue";
  if (dueDate && dueDate <= today) return "due";
  return "upcoming";
}

export async function reconcileInvoice(workspaceId: string, invoiceId: string) {
  if (!workspaceId || !invoiceId) return null;
  const { data: inv } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (!inv || inv.workspace_id !== workspaceId) return null;

  const { data: txns } = await supabaseAdmin
    .from("financial_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("invoice_id", invoiceId)
    .eq("transaction_type", "CLIENT_RECEIPT")
    .eq("status", "ACTIVE")
    .order("transaction_date", { ascending: false })
    .limit(200);

  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const grandTotal = Number(inv.grand_total) || 0;
  const balance = round2(Math.max(0, grandTotal - paid));
  const status = deriveInvoiceStatus({ ...inv, amount_paid: paid });

  const { data: updated } = await supabaseAdmin
    .from("invoices")
    .update({ amount_paid: paid, balance_due: balance, status })
    .eq("id", invoiceId)
    .select("*")
    .single();

  return updated;
}

export async function reconcileMilestone(workspaceId: string, milestoneId: string) {
  if (!workspaceId || !milestoneId) return null;
  const { data: m } = await supabaseAdmin
    .from("payment_milestones")
    .select("*")
    .eq("id", milestoneId)
    .single();
  if (!m || m.workspace_id !== workspaceId) return null;

  const { data: txns } = await supabaseAdmin
    .from("financial_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("milestone_id", milestoneId)
    .eq("transaction_type", "CLIENT_RECEIPT")
    .eq("status", "ACTIVE")
    .order("transaction_date", { ascending: false })
    .limit(200);

  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const due = Number(m.due_amount) || 0;
  const status = computeMilestoneStatus(paid, due, m.due_date || "");

  const { data: updated } = await supabaseAdmin
    .from("payment_milestones")
    .update({ paid_amount: paid, status })
    .eq("id", milestoneId)
    .select("*")
    .single();

  return updated;
}

export async function reconcileAfterTransactionChange(
  workspaceId: string,
  invoiceId?: string,
  milestoneId?: string
) {
  const results: any = {};
  if (invoiceId) {
    try { results.invoice = await reconcileInvoice(workspaceId, invoiceId); } catch {}
  }
  if (milestoneId) {
    try { results.milestone = await reconcileMilestone(workspaceId, milestoneId); } catch {}
  }
  return results;
}