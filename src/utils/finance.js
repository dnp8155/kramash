// Financial helpers for the Phase 5 ledger.
// All money is stored as numbers; all dates are date-only ISO (YYYY-MM-DD).
// Totals are always derived from ACTIVE transactions — never stored.

import {
  transactionTypes,
  onlineMethods,
} from "@/constants/finance";

const CLIENT_RECEIPT = transactionTypes[0];
const TEAM_PAYMENT = transactionTypes[1];
const BUSINESS_EXPENSE = transactionTypes[2];

// --- Financial Year (India: 1 April → 31 March) -----------------------------

// Finds the FinancialYear record that contains the given date.
export function findFYForDate(dateStr, financialYears) {
  if (!dateStr || !financialYears?.length) return null;
  return (
    financialYears.find(
      (fy) => dateStr >= fy.start_date && dateStr <= fy.end_date
    ) || null
  );
}

// Resolves the FY ID for a transaction. Uses the stored financial_year_id if
// present; otherwise falls back to date-based lookup from FY records.
export function resolveTransactionFYId(transaction, financialYears) {
  if (transaction.financial_year_id) return transaction.financial_year_id;
  if (!transaction.transaction_date || !financialYears?.length) return null;
  const fy = findFYForDate(transaction.transaction_date, financialYears);
  return fy?.id || null;
}

// Filters transactions by FY ID using resolveTransactionFYId for fallback.
// Pass null fyId to return all transactions.
export function filterTransactionsByFY(transactions, fyId, financialYears) {
  if (!fyId) return transactions;
  return transactions.filter(
    (t) => resolveTransactionFYId(t, financialYears) === fyId
  );
}

// Validates that a date range doesn't overlap with existing FYs.
export function checkFYOverlap(startDate, endDate, existingFYs, excludeId) {
  return existingFYs.some(
    (fy) =>
      (!excludeId || fy.id !== excludeId) &&
      startDate <= fy.end_date &&
      endDate >= fy.start_date
  );
}

// --- Money direction --------------------------------------------------------

export const isMoneyIn = (type) => type === CLIENT_RECEIPT;
export const isMoneyOut = (type) => type === TEAM_PAYMENT || type === BUSINESS_EXPENSE;
export const isOnlineMethod = (method) => onlineMethods.includes(method);

// --- Summation --------------------------------------------------------------

const active = (t) => t.status === "ACTIVE";

export function sumByType(transactions, type) {
  return transactions
    .filter((t) => active(t) && t.transaction_type === type)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

export function sumByMethod(transactions, type, method) {
  return transactions
    .filter(
      (t) =>
        active(t) &&
        t.transaction_type === type &&
        t.payment_method === method
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

// --- Derived statuses -------------------------------------------------------

// Client payment status derived from received vs contract value.
export function deriveClientStatus(received, contractValue) {
  const r = Number(received) || 0;
  const c = Number(contractValue) || 0;
  if (c <= 0) return r > 0 ? "Received" : "No Contract";
  if (r <= 0) return "Pending";
  if (r < c) return "Partially Paid";
  if (r === c) return "Paid";
  return "Overpaid";
}

// Team payment status derived from paid vs agreed rate.
export function deriveTeamStatus(paid, agreed) {
  const p = Number(paid) || 0;
  const a = Number(agreed) || 0;
  if (a <= 0) return p > 0 ? "Paid" : "No Rate";
  if (p <= 0) return "Unpaid";
  if (p < a) return "Partial";
  if (p === a) return "Paid";
  return "Overpaid";
}

// --- Event financial summary ------------------------------------------------

// Computes the full financial picture for a single event from its transactions
// and assignments. Nothing is stored — everything is derived.
export function computeEventFinancials({ transactions = [], event, assignments = [], serviceAssignments = [] }) {
  const eventTxns = transactions.filter((t) => t.event_id === event?.id);
  const baseContractValue = Number(event?.contract_value) || 0;

  // Add-on total from service assignments — added on top of base contract value
  const addonTotal = (serviceAssignments || [])
    .filter((sa) => sa.assignment_status === "Assigned" && sa.is_addon)
    .reduce((s, sa) => s + (Number(sa.rate) || 0), 0);
  const contractValue = baseContractValue + addonTotal;

  const received = sumByType(eventTxns, CLIENT_RECEIPT);
  const teamPaid = sumByType(eventTxns, TEAM_PAYMENT);
  const expenses = sumByType(eventTxns, BUSINESS_EXPENSE);

  const teamAgreed = assignments
    .filter((a) => a.assignment_status === "Assigned")
    .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);

  const clientPending = Math.max(0, contractValue - received);
  const clientOverpaid = Math.max(0, received - contractValue);
  const profit = received - teamPaid - expenses;

  // Service totals — separate from team. Service payments are transactions
  // linked via service_assignment_id (CLIENT_RECEIPT for client-provided
  // services, BUSINESS_EXPENSE for external provider services).
  const serviceAssignmentIds = new Set(
    (serviceAssignments || [])
      .filter((sa) => sa.assignment_status === "Assigned")
      .map((sa) => sa.id)
  );
  const serviceTotal = (serviceAssignments || [])
    .filter((sa) => sa.assignment_status === "Assigned")
    .reduce((s, sa) => s + (Number(sa.rate) || 0), 0);
  const servicePaid = eventTxns
    .filter((t) => active(t) && t.service_assignment_id && serviceAssignmentIds.has(t.service_assignment_id))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Per-assignment paid + remaining.
  const assignmentPayments = assignments
    .filter((a) => a.assignment_status === "Assigned")
    .map((a) => {
      const paid = eventTxns
        .filter((t) => active(t) && t.transaction_type === TEAM_PAYMENT && t.team_assignment_id === a.id)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const agreed = Number(a.agreed_rate) || 0;
      return {
        assignment: a,
        paid,
        remaining: Math.max(0, agreed - paid),
        overpaid: Math.max(0, paid - agreed),
        status: deriveTeamStatus(paid, agreed),
      };
    });

  return {
    contractValue: baseContractValue,
    adjustedContractValue: contractValue,
    addonTotal,
    received,
    clientPending,
    clientOverpaid,
    clientStatus: deriveClientStatus(received, contractValue),
    teamAgreed,
    teamPaid,
    teamRemaining: Math.max(0, teamAgreed - teamPaid),
    serviceTotal,
    servicePaid,
    serviceRemaining: Math.max(0, serviceTotal - servicePaid),
    expenses,
    profit,
    assignmentPayments,
  };
}

// --- Service payment summary -----------------------------------------------

// Service payment status derived from paid vs rate.
export function deriveServiceStatus(paid, rate) {
  const p = Number(paid) || 0;
  const r = Number(rate) || 0;
  if (r <= 0) return p > 0 ? "Paid" : "No Rate";
  if (p <= 0) return "Pending";
  if (p < r) return "Partially Paid";
  if (p === r) return "Paid";
  return "Overpaid";
}

// Computes payment summary for a single service assignment from transactions.
// Returns { rate, totalPaid, remaining, overpaid, status, payments }.
// payments are sorted newest-first. Nothing is stored — everything is derived.
export function computeServicePaymentSummary(serviceAssignment, transactions = []) {
  const rate = Number(serviceAssignment?.rate) || 0;
  const payments = transactions
    .filter((t) => t.status === "ACTIVE" && t.service_assignment_id === serviceAssignment?.id)
    .sort((a, b) => (b.transaction_date || "").localeCompare(a.transaction_date || ""));
  const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, rate - totalPaid);
  const overpaid = Math.max(0, totalPaid - rate);
  const status = deriveServiceStatus(totalPaid, rate);
  return { rate, totalPaid, remaining, overpaid, status, payments };
}

// --- Global workspace summary ----------------------------------------------

// Workspace-level totals from pre-filtered transactions.
// The caller is responsible for filtering by FY (use filterTransactionsByFY).
export function computeWorkspaceSummary(transactions = []) {
  const scoped = transactions.filter((t) => active(t));

  const received = scoped
    .filter((t) => t.transaction_type === CLIENT_RECEIPT)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const teamPaid = scoped
    .filter((t) => t.transaction_type === TEAM_PAYMENT)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expenses = scoped
    .filter((t) => t.transaction_type === BUSINESS_EXPENSE)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const totalPaid = teamPaid + expenses;
  const profit = received - totalPaid;

  // Cash vs Online for client receipts.
  const cashReceived = scoped
    .filter((t) => t.transaction_type === CLIENT_RECEIPT && t.payment_method === "Cash")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const onlineReceived = scoped
    .filter((t) => t.transaction_type === CLIENT_RECEIPT && isOnlineMethod(t.payment_method))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return {
    received,
    teamPaid,
    expenses,
    totalPaid,
    profit,
    cashReceived,
    onlineReceived,
  };
}