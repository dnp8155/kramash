const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
};

let activeCurrencySymbol = "₹";

// Called by WorkspaceContext when the active workspace resolves so every
// currency display follows the workspace's configured currency.
export function setCurrencySymbol(currency) {
  activeCurrencySymbol = currencySymbols[currency] || "₹";
}

export const formatCurrency = (amount, withSymbol = true) => {
  const value = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return withSymbol ? `${activeCurrencySymbol}${value}` : value;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();