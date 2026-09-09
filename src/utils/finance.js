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

// Returns { label, start, end } for the FY that contains the given date.
// e.g. "2026-09-09" → FY 2026-27 (2026-04-01 → 2027-03-31).
export function getFinancialYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    label: `FY ${startYear}-${String(endYear).slice(-2)}`,
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
  };
}

export function currentFinancialYear() {
  return getFinancialYear(todayStr());
}

// Build a descending list of FY labels: the active FY plus any FYs present in
// the given transactions, so the filter dropdown always offers relevant years.
export function financialYearOptions(transactions = []) {
  const set = new Set();
  const current = currentFinancialYear();
  if (current) set.add(current.label);
  transactions.forEach((t) => {
    const fy = getFinancialYear(t.transaction_date);
    if (fy) set.add(fy.label);
  });
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function isInFinancialYear(dateStr, fyLabel) {
  if (!fyLabel) return true;
  const fy = getFinancialYear(dateStr);
  return fy ? fy.label === fyLabel : false;
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
export function computeEventFinancials({ transactions = [], event, assignments = [] }) {
  const eventTxns = transactions.filter((t) => t.event_id === event?.id);
  const contractValue = Number(event?.contract_value) || 0;

  const received = sumByType(eventTxns, CLIENT_RECEIPT);
  const teamPaid = sumByType(eventTxns, TEAM_PAYMENT);
  const expenses = sumByType(eventTxns, BUSINESS_EXPENSE);

  const teamAgreed = assignments
    .filter((a) => a.assignment_status === "Assigned")
    .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);

  const clientPending = Math.max(0, contractValue - received);
  const clientOverpaid = Math.max(0, received - contractValue);
  const profit = received - teamPaid - expenses;

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
    contractValue,
    received,
    clientPending,
    clientOverpaid,
    clientStatus: deriveClientStatus(received, contractValue),
    teamAgreed,
    teamPaid,
    teamRemaining: Math.max(0, teamAgreed - teamPaid),
    expenses,
    profit,
    assignmentPayments,
  };
}

// --- Global workspace summary ----------------------------------------------

// Workspace-level totals, optionally filtered by financial year.
export function computeWorkspaceSummary(transactions = [], fyLabel = null) {
  const inFy = (t) => (fyLabel ? isInFinancialYear(t.transaction_date, fyLabel) : true);
  const scoped = transactions.filter((t) => active(t) && inFy(t));

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

  // Pending = sum of (contractValue - received) across events that have a
  // contract value, clamped at 0 (overpayments excluded).
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

// Today as YYYY-MM-DD (local).
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}