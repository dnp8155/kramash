// Payment options by the workspace CURRENCY (Preferences → Profile & Workspace → Currency): the money a business
// bills in decides how its clients pay. A studio in Dubai billing Indian clients in INR gets UPI + IFSC; billing in
// AED it gets IBAN + BIC. The country field plays no part.
//
// Saved data never changes: a payment is still stored with its method value ("Cash", "UPI", "Bank Transfer"…),
// bank details keep their keys (account_number, ifsc, upi_id). Only what people SEE follows the currency:
//   - the name of the instant-pay method (UPI for INR, Zelle for USD, PayID for AUD, Interac for CAD, none elsewhere),
//   - the bank-code label (IFSC, Routing number, Sort code, IBAN + BIC, BSB, SWIFT),
//   - which methods the dropdowns offer, and whether the UPI QR appears on documents.
// No currency saved = INR, exactly as before, so existing workspaces look the same.

// Currencies whose banks use IBAN (Euro area, Gulf, Pakistan, Switzerland, Nordics, Poland, Turkey…).
const IBAN_CURRENCIES = new Set(["EUR", "AED", "SAR", "QAR", "KWD", "OMR", "BHD", "PKR", "CHF", "SEK", "NOK", "DKK", "PLN", "TRY", "JOD", "EGP"]);

// One preset per region. `wallet` = the shown name of the stored "UPI" method (null = not offered there).
// `methods` = stored values offered in that region, in order. `codeLabel` names bank_details.ifsc;
// `accountLabel` names bank_details.account_number; `walletIdLabel` names bank_details.upi_id.
export const PAYMENT_PRESETS = {
  IN: { wallet: "UPI", walletIdLabel: "UPI ID", accountLabel: "Account Number", codeLabel: "IFSC Code", codeShort: "IFSC", showUpiQr: true,
        methods: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"] },
  US: { wallet: "Zelle", walletIdLabel: "Zelle email / phone", accountLabel: "Account Number", codeLabel: "Routing Number", showUpiQr: false,
        methods: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"] },
  GB: { wallet: null, walletIdLabel: "", accountLabel: "Account Number", codeLabel: "Sort Code", showUpiQr: false,
        methods: ["Cash", "Bank Transfer", "Card", "Other"] },
  IBAN: { wallet: null, walletIdLabel: "", accountLabel: "IBAN", codeLabel: "BIC / SWIFT", showUpiQr: false,
        methods: ["Cash", "Bank Transfer", "Card", "Other"] },
  AU: { wallet: "PayID", walletIdLabel: "PayID", accountLabel: "Account Number", codeLabel: "BSB", showUpiQr: false,
        methods: ["Cash", "UPI", "Bank Transfer", "Card", "Other"] },
  CA: { wallet: "Interac e-Transfer", walletIdLabel: "Interac email / phone", accountLabel: "Account Number", codeLabel: "Transit & Institution No.", showUpiQr: false,
        methods: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"] },
  OTHER: { wallet: null, walletIdLabel: "", accountLabel: "Account Number", codeLabel: "SWIFT Code", showUpiQr: false,
        methods: ["Cash", "Bank Transfer", "Card", "Other"] },
};

// Region key for the workspace currency ("INR", "USD"…). None saved = INR (the app default, same as before).
export function paymentRegion(currency) {
  const c = String(currency || "INR").trim().toUpperCase();
  if (c === "INR") return "IN";
  if (c === "USD") return "US";
  if (c === "GBP") return "GB";
  if (c === "AUD") return "AU";
  if (c === "CAD") return "CA";
  if (IBAN_CURRENCIES.has(c)) return "IBAN";
  return "OTHER";
}

// `codeShort` = the compact bank-code label used on PDFs and short forms ("IFSC" for INR; the full label elsewhere).
export function paymentPreset(currency) {
  const p = PAYMENT_PRESETS[paymentRegion(currency)];
  return { ...p, codeShort: p.codeShort || p.codeLabel };
}

// The name to SHOW for a stored method value. A stored "UPI" reads as the currency's wallet (Zelle, PayID…);
// where none is offered it stays "UPI" — such a record was made before this change, when it really was UPI.
export function methodLabel(method, currency) {
  if (method !== "UPI") return method || "";
  return paymentPreset(currency).wallet || "UPI";
}

// Account-number field rules: an IBAN is letters + digits (up to 34, shown in capitals, spaces dropped);
// everywhere else digits only (India 9–18; other countries up to 20).
export function accountFieldRules(currency) {
  const region = paymentRegion(currency);
  if (region === "IBAN") return { maxLength: 34, inputMode: "text", placeholder: "IBAN" };
  return { maxLength: region === "IN" ? 18 : 20, inputMode: "numeric", placeholder: "Account number" };
}
export function sanitizeAccountFor(raw, currency) {
  const { maxLength, inputMode } = accountFieldRules(currency);
  const s = String(raw ?? "");
  return (inputMode === "text" ? s.replace(/[^a-z0-9]/gi, "").toUpperCase() : s.replace(/\D/g, "")).slice(0, maxLength);
}

// The "Payment Method" line printed on quotations (Preferences default + per quotation): saved as the shown NAME
// ("Bank Transfer", "Zelle"…). The currency's names, plus whatever is already saved so it never disappears.
export function methodNamesFor(currency, current) {
  const preset = paymentPreset(currency);
  const names = ["Bank Transfer", "UPI", "Cash", "Cheque", "Card", "Other"].filter((m) => preset.methods.includes(m)).map((m) => methodLabel(m, currency));
  return current && !names.includes(current) ? [...names, current] : names;
}

// For code outside React (Excel export): the open workspace's currency, synced from WorkspaceContext like the
// date format and timezone.
let _currency = "INR";
export function setPaymentCurrency(currency) { _currency = currency || "INR"; }
export const shownMethod = (method) => methodLabel(method, _currency);
