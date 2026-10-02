// Payment Milestone service: workspace-scoped CRUD for milestone dues,
// status derivation, and payment-linked reconciliation.
// Milestones are DUES (not payments) — paid_amount is derived from
// linked CLIENT_RECEIPT transactions, never auto-set on acceptance.

import { base44 } from "@/api/base44Client";
import { syncQuotationAcceptance } from "@/lib/clientEdgeFunctions";
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

// Recalculate due_amount for percent milestones when the full contract
// value (base + service add-ons + misc add-ons) changes. Fixed milestones
// are unaffected. Updates the database only when the value actually changes.
export async function recalculateMilestoneDueAmounts(workspaceId, eventId, fullContractValue) {
  if (!workspaceId || !eventId) return [];
  const milestones = await loadMilestones(workspaceId, { eventId });
  if (milestones.length === 0) return [];

  const updates = [];
  for (const m of milestones) {
    if (m.milestone_type !== "percent") continue;
    const newDue = round2((fullContractValue * (Number(m.milestone_value) || 0)) / 100);
    const oldDue = Number(m.due_amount) || 0;
    if (newDue !== oldDue) {
      const updated = await base44.entities.PaymentMilestone.update(m.id, {
        due_amount: newDue,
        status: deriveMilestoneStatus({ ...m, due_amount: newDue })
      });
      updates.push(updated);
    }
  }
  return updates;
}

// ---- Sync trigger (frontend → backend function) ----

export async function syncAcceptedQuotation(workspaceId, quotationId) {
  if (!workspaceId || !quotationId) return null;
  return syncQuotationAcceptance(workspaceId, quotationId);
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

// ---- Default template & auto-generation ----

// Read the default milestone template from workspace display_preferences.
export function getDefaultMilestoneTemplate(workspace) {
  try {
    const prefs = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : {};
    const templates = prefs.milestoneTemplates || [];
    return templates.find((t) => t.is_default) || null;
  } catch {
    return null;
  }
}

// Best-effort real due_date from a template milestone's free-text due_condition
// (e.g. "On signing", "On event day", "On delivery") plus the event's own
// dates. Conditions that don't map to a known point in the event lifecycle
// (like "On signing", which can happen any time before the event) are left
// blank for the user to fill in.
export function inferDueDate(dueCondition, eventStartDate, eventEndDate) {
  const c = (dueCondition || "").toLowerCase();
  if (!c) return "";
  if (c.includes("event day") || c.includes("event date") || c.includes("shoot day")) {
    return eventStartDate || "";
  }
  if (c.includes("after event") || c.includes("post event") || c.includes("delivery") || c.includes("handover")) {
    if (!eventEndDate) return "";
    const d = new Date(eventEndDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return "";
}

// Auto-generate PaymentMilestone records for an event from a template —
// used both when a new event is created (with its default template) and
// when a template is applied manually from the event's Milestones tab.
export async function generateMilestonesFromTemplate(workspaceId, eventId, clientId, contractValue, template, eventStartDate = "", eventEndDate = "") {
  if (!workspaceId || !eventId || !template?.milestones?.length) return [];
  const payloads = template.milestones.map((m, idx) => {
    const value = Number(m.value) || 0;
    const dueAmount = m.type === "percent"
      ? round2((contractValue * value) / 100)
      : round2(value);
    return {
      workspace_id: workspaceId,
      event_id: eventId,
      client_id: clientId || null,
      quotation_id: null,
      name: m.name || `Milestone ${idx + 1}`,
      milestone_type: m.type === "fixed" ? "fixed" : "percent",
      milestone_value: value,
      due_amount: dueAmount,
      paid_amount: 0,
      due_condition: m.due_condition || "",
      due_date: inferDueDate(m.due_condition, eventStartDate, eventEndDate) || null,
      sort_order: idx,
      status: "upcoming"
    };
  });
  return base44.entities.PaymentMilestone.bulkCreate(payloads);
}