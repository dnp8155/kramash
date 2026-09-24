// Quotation helpers — rounding, totals, and item calculations.
export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function computeLineTotal(item) {
  const qty = Number(item.quantity) || 1;
  const days = Number(item.days) || 1;
  const rate = Number(item.unit_rate) || 0;
  return round2(qty * days * rate);
}

export function computeQuotationTotals(items, options = {}) {
  const {
    discountType = "percent",
    discountValue = 0,
    gstApplicable = false,
    gstRate = 0,
    gstMode = "cgst_sgst"
  } = options;

  const lineItems = (items || []).map((it) => ({
    ...it,
    line_total: it.line_total != null ? round2(it.line_total) : computeLineTotal(it)
  }));

  const subtotal = round2(lineItems.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0));
  let discountAmount = 0;
  if (discountType === "percent") {
    discountAmount = round2((subtotal * (Number(discountValue) || 0)) / 100);
  } else {
    discountAmount = round2(Number(discountValue) || 0);
  }
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0, gstTotal = 0;
  if (gstApplicable && gstRate > 0) {
    gstTotal = round2((taxableAmount * (Number(gstRate) || 0)) / 100);
    if (gstMode === "cgst_sgst") {
      cgstAmount = round2(gstTotal / 2);
      sgstAmount = round2(gstTotal / 2);
    } else {
      igstAmount = gstTotal;
    }
  }
  const grandTotal = round2(taxableAmount + gstTotal);
  return { lineItems, subtotal, discountAmount, taxableAmount, gstTotal, cgstAmount, sgstAmount, igstAmount, grandTotal };
}