// "Shared logo" settings (Preferences → Types & Display → Shared Logo): whether your logo appears on what you
// share with clients. Stored in workspace.display_preferences.
//   showLogoOnInvoice — invoices: the PDF and the shared invoice link. Before this setting existed, invoices followed
//                       the quotation logo switch, so that is still the fallback until the owner picks a value.
//   showLogo          — receipts: the starting choice in the share-receipt screen (payments tab and Financial page).
//                       The owner can still switch the logo on or off for each receipt when sharing.
export function invoiceLogoOn(prefs) {
  const p = prefs || {};
  if (typeof p.showLogoOnInvoice === "boolean") return p.showLogoOnInvoice;
  return p.showLogoOnQuotation !== false;
}

// Logo watermark strength (Preferences → Quotation → Quotation Logo), shared by quotations and invoices.
// Stored as a percentage in display_preferences.logoWatermarkOpacity; 5% was the fixed value before the slider.
export const WATERMARK_OPACITY_DEFAULT = 5;
export const WATERMARK_OPACITY_MIN = 1;
export const WATERMARK_OPACITY_MAX = 30;

export function watermarkOpacityPercent(prefs) {
  const raw = (prefs || {}).logoWatermarkOpacity;
  const n = Number(raw);
  if (raw == null || raw === "" || !Number.isFinite(n)) return WATERMARK_OPACITY_DEFAULT;
  return Math.min(WATERMARK_OPACITY_MAX, Math.max(WATERMARK_OPACITY_MIN, n));
}

export function watermarkOpacity(prefs) {
  return watermarkOpacityPercent(prefs) / 100;
}

export function receiptLogoDefault(prefs) {
  return !!(prefs || {}).showLogo;
}
