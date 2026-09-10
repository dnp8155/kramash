import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

export function formatINR(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

// Currency-aware money formatting. Defaults to INR (₹) for backward compatibility.
export function formatMoney(amount, currency = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return symbol + Number(amount || 0).toLocaleString("en-IN");
}