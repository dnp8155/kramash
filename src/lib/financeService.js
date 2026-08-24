// Phase 5 financial service: workspace-scoped transaction queries,
// derived totals, and payment-status helpers.
// All totals are derived from FinancialTransaction records — no stored totals.

import { base44 } from "@/api/base44Client";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  methodCategory,
  dateInFY
} from "@/constants/financeConfig";

// ---- Queries ----

// Load transactions for a workspace with optional filters.
// FY + payment-method-category are applied client-side (date/category based);
// event_id and transaction_type are pushed to the backend filter.
export async function loadTransactions(workspaceId, {
  fyLabel = null,
  eventId = null,
  transactionType = null,
  paymentMethod = null
} = {}) {
  if (!workspaceId) return [];
  const query = { workspace_id: workspaceId };
  if (eventId) query.event_id = eventId;
  if (transactionType && transactionType !== "All") query.transaction_type = transactionType;
  const list = await base44.entities.FinancialTransaction.filter(query, "-transaction_date", 1000);
  let res = list || [];
  if (fyLabel) res = res.filter((t) => dateInFY(t.transaction_date, fyLabel));
  if (paymentMethod && paymentMethod !== "All") {
    res = res.filter((t) => methodCategory(t.payment_method) === paymentMethod);
  }
  return res;
}

// Load all transactions for a workspace (no FY filter) — used for FY breakdown.
export async function loadAllTransactions(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId }, "-transaction_date", 2000
  );
  return list || [];
}

// ---- Derived totals (active transactions only) ----

export function activeTransactions(transactions) {
  return (transactions || []).filter((t) => t.status === "ACTIVE");
}

export function sumByType(transactions, type) {
  return (transactions || [])
    .filter((t) => t.transaction_type === type && t.status === "ACTIVE")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

export function totalReceived(transactions) {
  return sumByType(transactions, "CLIENT_RECEIPT");
}

export function totalTeamPaid(transactions) {
  return sumByType(transactions, "TEAM_PAYMENT");
}

export function totalExpenses(transactions) {
  return sumByType(transactions, "BUSINESS_EXPENSE");
}

// Total Paid = Team Payments + Business Expenses.
export function totalPaid(transactions) {
  return totalTeamPaid(transactions) + totalExpenses(transactions);
}

// Actual cash-based profit = Received - Team Paid - Expenses.
export function actualProfit(transactions) {
  return totalReceived(transactions) - totalPaid(transactions);
}

// ---- Per-event summary ----

export function eventFinancialSummary(event, transactions, assignments) {
  const contractValue = Number(event?.contract_value) || 0;
  const evTx = (transactions || []).filter(
    (t) => t.event_id === event?.id && t.status === "ACTIVE"
  );
  const received = sumByType(evTx, "CLIENT_RECEIPT");
  const teamPaid = sumByType(evTx, "TEAM_PAYMENT");
  const expenses = sumByType(evTx, "BUSINESS_EXPENSE");
  const teamAgreed = (assignments || [])
    .filter((a) => a.assignment_status !== "removed")
    .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const pending = Math.max(0, contractValue - received);
  const overpaid = received > contractValue ? received - contractValue : 0;
  const profit = received - teamPaid - expenses;
  return { contractValue, received, pending, overpaid, teamAgreed, teamPaid, expenses, profit };
}

// ---- Per-assignment team paid ----

export function assignmentPaid(transactions, assignmentId) {
  if (!assignmentId) return 0;
  return (transactions || [])
    .filter(
      (t) =>
        t.team_assignment_id === assignmentId &&
        t.transaction_type === "TEAM_PAYMENT" &&
        t.status === "ACTIVE"
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

// All team payments for a member across assignments.
export function memberPaidTotal(transactions, memberId) {
  return (transactions || [])
    .filter(
      (t) =>
        t.team_member_id === memberId &&
        t.transaction_type === "TEAM_PAYMENT" &&
        t.status === "ACTIVE"
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

// ---- Derived payment status ----

export function clientPaymentStatus(received, contractValue) {
  if (contractValue <= 0) return received > 0 ? "Overpaid" : "Pending";
  if (received <= 0) return "Pending";
  if (received < contractValue) return "Partially Paid";
  if (received === contractValue) return "Paid";
  return "Overpaid";
}

export function teamPaymentStatus(paid, agreedRate) {
  if (agreedRate <= 0) return paid > 0 ? "Overpaid" : "Unpaid";
  if (paid <= 0) return "Unpaid";
  if (paid < agreedRate) return "Partial";
  if (paid === agreedRate) return "Paid";
  return "Overpaid";
}

// ---- Method breakdown (Cash vs Online) ----

export function methodBreakdown(transactions) {
  const online = { received: 0, paid: 0 };
  const cash = { received: 0, paid: 0 };
  for (const t of activeTransactions(transactions)) {
    const bucket = methodCategory(t.payment_method) === "Cash" ? cash : online;
    if (t.transaction_type === "CLIENT_RECEIPT") bucket.received += Number(t.amount) || 0;
    else bucket.paid += Number(t.amount) || 0;
  }
  return { online, cash };
}

// ---- Expense categories ----

export async function ensureDefaultExpenseCategories(workspaceId) {
  if (!workspaceId) return 0;
  const existing = await base44.entities.ExpenseCategory.filter(
    { workspace_id: workspaceId }, "name", 100
  );
  if (existing && existing.length > 0) return 0;
  const created = await base44.entities.ExpenseCategory.bulkCreate(
    DEFAULT_EXPENSE_CATEGORIES.map((n) => ({
      workspace_id: workspaceId,
      name: n,
      status: "active"
    }))
  );
  return Array.isArray(created) ? created.length : 0;
}

export async function loadExpenseCategories(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.ExpenseCategory.filter(
    { workspace_id: workspaceId }, "name", 100
  );
  return list || [];
}

// ---- Relationship security (client-side guard before create) ----

// Verify event + client belong to the workspace and are linked.
export async function verifyClientPaymentRefs(workspaceId, eventId, clientId) {
  if (!workspaceId || !eventId || !clientId) return false;
  try {
    const ev = await base44.entities.Event.get(eventId);
    if (!ev || ev.workspace_id !== workspaceId) return false;
    if (ev.client_id !== clientId) return false;
    const cl = await base44.entities.Client.get(clientId);
    if (!cl || cl.workspace_id !== workspaceId) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// Verify event + assignment + member belong to the workspace and are linked.
export async function verifyTeamPaymentRefs(workspaceId, eventId, assignmentId, memberId) {
  if (!workspaceId || !eventId || !assignmentId) return false;
  try {
    const ev = await base44.entities.Event.get(eventId);
    if (!ev || ev.workspace_id !== workspaceId) return false;
    const a = await base44.entities.EventTeamAssignment.get(assignmentId);
    if (!a || a.workspace_id !== workspaceId) return false;
    if (a.event_id !== eventId) return false;
    if (a.team_member_id !== memberId) return false;
    return true;
  } catch (e) {
    return false;
  }
}