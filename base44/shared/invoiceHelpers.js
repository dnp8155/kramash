// Invoice helpers shared across backend functions.
import { round2 } from "./quotationHelpers.js";

export function computeInvoiceTotals(items, options = {}) {
  const {
    discountType = "percent",
    discountValue = 0,
    gstApplicable = false,
    gstRate = 0,
    gstMode = "cgst_sgst"
  } = options;

  const subtotal = (items || []).reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);
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
  return { subtotal, discountAmount, taxableAmount, gstTotal, cgstAmount, sgstAmount, igstAmount, grandTotal };
}

export function applyPayment(invoice, amountPaid) {
  const prevPaid = Number(invoice.amount_paid) || 0;
  const newPaid = round2(prevPaid + (Number(amountPaid) || 0));
  const grand = Number(invoice.grand_total) || 0;
  const balanceDue = round2(Math.max(0, grand - newPaid));
  let status = invoice.status;
  if (balanceDue <= 0) status = "paid";
  else if (newPaid > 0) status = "partial";
  return { amount_paid: newPaid, balance_due: balanceDue, status };
}