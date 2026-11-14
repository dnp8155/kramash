// Phase 5 financial configuration: transaction types, payment methods,
// expense categories, currency symbols, and financial-year helpers.

import { getFyStartMonth, toISODate } from "@/lib/dates";

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

// Generic categories every kind of business can use.
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Travel",
  "Accommodation",
  "Equipment Rental",
  "Food",
  "Printing",
  "Miscellaneous"
];

// Extra starter categories that only make sense for some kinds of business.
const CATEGORY_EXPENSE_EXTRAS = {
  PHOTOGRAPHY: ["Album Printing", "Venue"],
  EVENT_MANAGEMENT: ["Venue", "Decor"],
  CATERING: ["Raw Materials", "Venue"],
  ARCHITECTURE: ["Site Visit"],
  INTERIOR: ["Materials", "Site Visit"],
  CONTRACTING: ["Materials", "Site Visit"],
  SALON_BEAUTY: ["Products & Supplies"],
};

export function getExpenseCategoryPresets(category) {
  const extras = CATEGORY_EXPENSE_EXTRAS[category] || [];
  return [...DEFAULT_EXPENSE_CATEGORIES, ...extras.filter((e) => !DEFAULT_EXPENSE_CATEGORIES.includes(e))];
}

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

// ---- Financial Year (start month configurable via workspace preferences; default 1 April) ----

// Returns a label like "FY 2026-27" for the current date.
export function currentFinancialYearLabel() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const startIdx = getFyStartMonth() - 1;
  if (m >= startIdx) return `FY ${y}-${String(y + 1).slice(-2)}`;
  return `FY ${y - 1}-${String(y).slice(-2)}`;
}

// "FY 2026-27" => { start: "2026-04-01", end: "2027-03-31" } (dates follow the
// configured FY start month, not always April).
export function financialYearRange(label) {
  if (!label) return null;
  const m = label.match(/FY\s*(\d{4})-(\d{2})/);
  if (!m) return null;
  const startYear = parseInt(m[1], 10);
  const startIdx = getFyStartMonth() - 1;
  const endDateObj = new Date(startYear + 1, startIdx, 1);
  endDateObj.setDate(endDateObj.getDate() - 1);
  return {
    start: `${startYear}-${String(startIdx + 1).padStart(2, "0")}-01`,
    end: toISODate(endDateObj),
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