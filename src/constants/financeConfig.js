// Phase 5 financial configuration: transaction types, payment methods,
// expense categories, currency symbols, and India-style financial-year helpers.

export const TRANSACTION_TYPES = {
  CLIENT_RECEIPT: { label: "Client Payment", direction: "in" },
  TEAM_PAYMENT: { label: "Team Payment", direction: "out" },
  BUSINESS_EXPENSE: { label: "Expense", direction: "out" }
};

export const TRANSACTION_TYPE_ORDER = ["CLIENT_RECEIPT", "TEAM_PAYMENT", "BUSINESS_EXPENSE"];

export const PAYMENT_METHOD_LIST = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Card",
  "Cheque",
  "Other"
];

// Methods classified as "Online" for the Cash/Online breakdown.
export const ONLINE_METHODS = ["UPI", "Bank Transfer", "Card", "Cheque", "Other"];

export function methodCategory(method) {
  return method === "Cash" ? "Cash" : "Online";
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Travel",
  "Hotel",
  "Equipment Rental",
  "Album Printing",
  "Food",
  "Venue",
  "Miscellaneous"
];

export const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$"
};

// ---- Financial Year (India: 1 April – 31 March) ----

// Returns a label like "FY 2026-27" for the current date.
export function currentFinancialYearLabel() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  if (m >= 3) return `FY ${y}-${String(y + 1).slice(-2)}`;
  return `FY ${y - 1}-${String(y).slice(-2)}`;
}

// "FY 2026-27" => { start: "2026-04-01", end: "2027-03-31" }
export function financialYearRange(label) {
  if (!label) return null;
  const m = label.match(/FY\s*(\d{4})-(\d{2})/);
  if (!m) return null;
  const startYear = parseInt(m[1], 10);
  const endYear = startYear + 1;
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
    label
  };
}

// True when an ISO date (YYYY-MM-DD) falls inside the given FY label.
export function dateInFY(dateISO, label) {
  if (!dateISO) return false;
  const r = financialYearRange(label);
  if (!r) return true;
  return dateISO >= r.start && dateISO <= r.end;
}