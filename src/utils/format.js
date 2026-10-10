import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

// ---- Workspace-configurable number format ----
// Synced from WorkspaceContext whenever the active workspace loads/changes.
// "indian" groups digits as 1,00,000 (lakh/crore style); "western" as 100,000.
let _numberFormat = "indian";
export function setNumberFormat(fmt) {
  _numberFormat = fmt === "western" ? "western" : "indian";
}
export function getNumberFormat() {
  return _numberFormat;
}
function groupingLocale() {
  return _numberFormat === "western" ? "en-US" : "en-IN";
}

export function formatINR(amount) {
  return "₹" + Number(amount || 0).toLocaleString(groupingLocale());
}

// Currency-aware money formatting. Defaults to INR (₹) for backward compatibility.
export function formatMoney(amount, currency = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return symbol + Number(amount || 0).toLocaleString(groupingLocale());
}

// Compact currency formatting for tight spaces like chart axes.
// INR uses Indian lakh/crore notation (₹1.2L, ₹3.4Cr); other currencies use k/M (₹45k, $2.3M).
export function formatMoneyCompact(amount, currency = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  const n = Number(amount || 0);
  const abs = Math.abs(n);
  const trim = (v) => v.toFixed(1).replace(/\.0$/, "");

  if (currency === "INR") {
    if (abs >= 1e7) return `${symbol}${trim(n / 1e7)}Cr`;
    if (abs >= 1e5) return `${symbol}${trim(n / 1e5)}L`;
    if (abs >= 1e3) return `${symbol}${trim(n / 1e3)}k`;
    return `${symbol}${n}`;
  }

  if (abs >= 1e9) return `${symbol}${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${symbol}${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `${symbol}${trim(n / 1e3)}k`;
  return `${symbol}${n}`;
}