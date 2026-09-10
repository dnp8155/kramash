// Payment Milestone service: workspace-scoped CRUD for milestone dues,
// status derivation, and payment-linked reconciliation.
// Milestones are DUES (not payments) — paid_amount is derived from
// linked CLIENT_RECEIPT transactions, never auto-set on acceptance.

import { base44 } from "@/api/base44Client";
import { round2 } from "@/lib/quotationCalc";

// ---- Queries ----

export async function loadMilestones(workspaceId, { eventId = null, quotationId = null } = {}) {
  if (!workspaceId) return [];
  const query = { workspace_id: workspaceId };
  if (eventId) query.event_id = eventId;
  if (quotationId) query.quotation_id = quotationId;
  const list = await base44.entities.PaymentMilestone.filter(query, "sort_order", 200);
  return list || [];
}

export async function loadMilestone(workspaceId, milestoneId) {
  if (!workspaceId || !milestoneId) return null;
  try {
    const m = await base44.entities.PaymentMilestone.get(milestoneId);
    if (!m || m.workspace_id !== workspaceId) return null;
    return m;
  } catch (e) {
    return null;
  }
}

// ---- Status derivation ----

// Derive milestone status from paid_amount, due_amount, and due_date.
// Does NOT auto-mark as paid — only actual payments update paid_amount.
export function deriveMilestoneStatus(milestone) {
  const due = Number(milestone?.due_amount) || 0;
  const paid = Number(milestone?.paid_amount) || 0;
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = milestone?.due_date || "";

  if (due <= 0) return "upcoming";
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  if (dueDate && dueDate < today) return "overdue";
  if (dueDate && dueDate <= today) return "due";
  return "upcoming";
}

// ---- Payment reconciliation ----

// Recalculate paid_amount for a milestone from linked CLIENT_RECEIPT transactions.
// Called after a payment is recorded or voided.
export async function reconcileMilestonePayments(workspaceId, milestoneId, transactions) {
  if (!workspaceId || !milestoneId) return null;
  const m = await loadMilestone(workspaceId, milestoneId);
  if (!m) return null;

  // If transactions are passed, use them; otherwise load from DB
  let txns = transactions;
  if (!txns) {
    txns = await base44.entities.FinancialTransaction.filter({
      workspace_id: workspaceId,
      milestone_id: milestoneId,
      transaction_type: "CLIENT_RECEIPT",
      status: "ACTIVE"
    }, "-transaction_date", 200);
  }

  const paidAmount = (txns || [])
    .filter((t) => t.milestone_id === milestoneId && t.status === "ACTIVE")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const paid = round2(paidAmount);
  const status = deriveMilestoneStatus({ ...m, paid_amount: paid });

  return base44.entities.PaymentMilestone.update(milestoneId, {
    paid_amount: paid,
    status
  });
}

// Reconcile all milestones for an event from the event's transactions.
export async function reconcileEventMilestones(workspaceId, eventId, transactions) {
  if (!workspaceId || !eventId) return [];
  const milestones = await loadMilestones(workspaceId, { eventId });
  if (milestones.length === 0) return [];

  let txns = transactions;
  if (!txns) {
    txns = await base44.entities.FinancialTransaction.filter({
      workspace_id: workspaceId,
      event_id: eventId,
      transaction_type: "CLIENT_RECEIPT",
      status: "ACTIVE"
    }, "-transaction_date", 500);
  }

  const updates = [];
  for (const m of milestones) {
    const paid = round2(
      (txns || [])
        .filter((t) => t.milestone_id === m.id && t.status === "ACTIVE")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0)
    );
    const status = deriveMilestoneStatus({ ...m, paid_amount: paid });
    const updated = await base44.entities.PaymentMilestone.update(m.id, {
      paid_amount: paid,
      status
    });
    updates.push(updated);
  }
  return updates;
}

// ---- Sync trigger (frontend → backend function) ----

export async function syncAcceptedQuotation(workspaceId, quotationId) {
  if (!workspaceId || !quotationId) return null;
  return base44.functions.invoke("syncQuotationAcceptance", {
    workspace_id: workspaceId,
    quotation_id: quotationId
  });
}

// ---- Status metadata (for UI badges) ----

export const MILESTONE_STATUS_META = {
  upcoming: { label: "Upcoming", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  due: { label: "Due", className: "bg-badge-progress-bg text-badge-progress-fg" },
  partially_paid: { label: "Partially Paid", className: "bg-badge-progress-bg text-badge-progress-fg" },
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" }
};

// ---- Totals ----

export function milestoneTotals(milestones) {
  const list = milestones || [];
  const totalDue = round2(list.reduce((s, m) => s + (Number(m.due_amount) || 0), 0));
  const totalPaid = round2(list.reduce((s, m) => s + (Number(m.paid_amount) || 0), 0));
  const totalRemaining = round2(Math.max(0, totalDue - totalPaid));
  return { totalDue, totalPaid, totalRemaining };
}