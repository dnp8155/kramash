// Quotation calculation helpers: line totals, subtotals by item type,
// discount, GST, and grand total. Shared by the estimator and quotation editor.

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

// Subtotals grouped by item_type (team, service, custom, role).
export function subtotalsByType(items) {
  const groups = { team: 0, service: 0, custom: 0, role: 0 };
  for (const it of items || []) {
    const lt = lineTotal(it);
    const t = it.item_type || "custom";
    if (groups[t] !== undefined) groups[t] = round2(groups[t] + lt);
    else groups.custom = round2(groups.custom + lt);
  }
  return groups;
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

// ---- Payment Milestone helpers ----

// Calculate milestone amounts from a schedule and a grand total.
// Each milestone: { name, type: "percent"|"fixed", value, due_condition }
export function calculateMilestones(schedule, grandTotal) {
  const total = Math.max(0, Number(grandTotal) || 0);
  return (schedule || []).map((m) => {
    const v = Math.max(0, Number(m.value) || 0);
    const amount = m.type === "fixed" ? round2(v) : round2((total * v) / 100);
    return { ...m, calculated_amount: amount };
  });
}

// Validate that percentage-based milestones don't exceed 100%.
export function validateMilestones(schedule, grandTotal) {
  if (!schedule || schedule.length === 0) return "";
  const pctSum = schedule
    .filter((m) => m.type === "percent")
    .reduce((s, m) => s + (Number(m.value) || 0), 0);
  if (pctSum > 100) return `Percentage milestones total ${pctSum}% — cannot exceed 100%.`;
  const fixedSum = schedule
    .filter((m) => m.type === "fixed")
    .reduce((s, m) => s + (Number(m.value) || 0), 0);
  if (fixedSum > grandTotal) return `Fixed milestones total ${round2(fixedSum)} — exceeds quotation total of ${round2(grandTotal)}.`;
  return "";
}

// ---- Date Engine helpers ----

// Generate all dates in a range (inclusive), returned as YYYY-MM-DD strings.
export function datesInRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const result = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const cur = new Date(start);
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// Included dates = all dates in range minus excluded dates.
export function includedDates(startDate, endDate, excludedDates = []) {
  const all = datesInRange(startDate, endDate);
  const excl = new Set(excludedDates || []);
  return all.filter((d) => !excl.has(d));
}

// Format a date as "20 Feb" for chip display.
export function formatDateChip(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// Format a date as "20 Feb 2026" for full display.
export function formatDateFull(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}