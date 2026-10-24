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

export function receiptLogoDefault(prefs) {
  return !!(prefs || {}).showLogo;
}
