// Financial constants for the Phase 5 ledger.
// Internal enums are kept separate from user-facing labels (see utils/finance.js).

export const transactionTypes = ["CLIENT_RECEIPT", "TEAM_PAYMENT", "BUSINESS_EXPENSE"];

export const transactionTypeLabels = {
  CLIENT_RECEIPT: "Client Payment",
  TEAM_PAYMENT: "Team Payment",
  BUSINESS_EXPENSE: "Expense",
};

export const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];

// Methods classified as "Online" for the Cash/Online breakdown.
export const onlineMethods = ["UPI", "Bank Transfer", "Card"];

export const transactionStatuses = ["ACTIVE", "VOID"];

// Sensible default expense categories seeded for a new workspace.
export const defaultExpenseCategories = [
  "Travel",
  "Hotel",
  "Equipment Rental",
  "Album Printing",
  "Food",
  "Venue",
  "Miscellaneous",
];