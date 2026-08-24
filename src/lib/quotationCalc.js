// Phase 6 pure calculation helpers for estimator + quotation.
// Shared by the Rate Estimator and the Quotation editor so totals stay consistent.
// All money values are rounded to 2 decimals to avoid floating-point drift.

export function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// Effective unit count for a line item.
// Per Day items multiply quantity x days; everything else is quantity x 1.
export function effectiveUnits(item) {
  const qty = Math.max(0, Number(item?.quantity) || 0);
  const days = Math.max(0, Number(item?.days) || 0);
  const isDayBased = item?.rate_type === "Per Day";
  const d = isDayBased ? (days || 1) : 1;
  return qty * d;
}

// Line total = quantity x (days where applicable) x unit_rate.
export function lineTotal(item) {
  const rate = Math.max(0, Number(item?.unit_rate) || 0);
  return round2(effectiveUnits(item) * rate);
}

// Subtotal = sum of all line totals.
export function subtotalOf(items) {
  return round2((items || []).reduce((s, it) => s + lineTotal(it), 0));
}

// Discount amount from type/value, clamped to subtotal.
export function discountAmount(subtotal, type, value) {
  const v = Math.max(0, Number(value) || 0);
  if (type === "fixed") return round2(Math.min(v, subtotal));
  const pct = Math.min(Math.max(v, 0), 100);
  return round2((subtotal * pct) / 100);
}

// Full quotation totals including optional GST with per-item rates.
// opts: { discountType, discountValue, gstApplicable, gstMode }
export function computeTotals(items, opts = {}) {
  const subtotal = subtotalOf(items);
  const disc = discountAmount(subtotal, opts.discountType || "percent", opts.discountValue || 0);
  const taxable = round2(Math.max(0, subtotal - disc));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let gstTotal = 0;

  if (opts.gstApplicable) {
    // Apply discount proportionally across items so GST base stays correct
    // even when items carry different GST rates.
    const factor = subtotal > 0 ? taxable / subtotal : 0;
    const mode = opts.gstMode || "cgst_sgst";
    for (const it of items || []) {
      const base = round2(lineTotal(it) * factor);
      const rate = Math.max(0, Number(it.gst_rate) || 0);
      const itemGst = round2((base * rate) / 100);
      if (mode === "igst") {
        igst = round2(igst + itemGst);
      } else {
        cgst = round2(cgst + round2(itemGst / 2));
        sgst = round2(sgst + round2(itemGst / 2));
      }
      gstTotal = round2(gstTotal + itemGst);
    }
  }

  const grand = round2(taxable + gstTotal);
  return {
    subtotal,
    discountAmount: disc,
    taxableAmount: taxable,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    gstTotal,
    grandTotal: grand
  };
}

// Estimator total with markup applied to cost subtotal.
export function estimatorTotals(items, markupPct = 0) {
  const cost = subtotalOf(items);
  const markup = round2((cost * (Math.max(0, Number(markupPct) || 0))) / 100);
  const total = round2(cost + markup);
  return { cost, markup, total };
}

// Apply a markup percentage to each item's unit rate (used when carrying
// estimator items into a client-facing quotation).
export function applyMarkupToItems(items, markupPct) {
  const factor = 1 + (Math.max(0, Number(markupPct) || 0)) / 100;
  return (items || []).map((it) => ({
    ...it,
    unit_rate: round2((Number(it.unit_rate) || 0) * factor)
  }));
}