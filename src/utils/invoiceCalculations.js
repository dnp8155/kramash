// Invoice financial calculations — shared across admin editor, detail, and PDF.
import { amountInWords } from "@/utils/numberToWords";

export function calculateInvoiceTotals(data) {
  const {
    line_items = [],
    discount_type = "percentage",
    discount_value = 0,
    tax_enabled = false,
    tax_rate = 0,
    tax_mode = "CGST_SGST",
  } = data;

  const subtotal = (line_items || []).reduce(
    (sum, item) => sum + (item.line_total || 0),
    0
  );

  const discountAmount =
    discount_type === "percentage"
      ? Math.round((subtotal * (discount_value || 0)) / 100)
      : Math.min(discount_value || 0, subtotal);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0, taxAmount = 0;
  if (tax_enabled && tax_rate > 0) {
    taxAmount = Math.round((taxableAmount * tax_rate) / 100);
    if (tax_mode === "CGST_SGST") {
      cgstAmount = Math.round(taxAmount / 2);
      sgstAmount = taxAmount - cgstAmount;
    } else {
      igstAmount = taxAmount;
    }
  }

  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    amount_in_words: amountInWords(totalAmount),
  };
}

export function computeDueDate(issueDate, dueDateType, customDueDate) {
  if (!issueDate) return "";
  if (dueDateType === "custom" && customDueDate) return customDueDate;
  if (dueDateType === "due_on_receipt") return issueDate;
  const d = new Date(issueDate + "T00:00:00");
  if (dueDateType === "net_15") d.setDate(d.getDate() + 15);
  else if (dueDateType === "net_30") d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function computeInvoiceStatus(amountPaid, balanceDue, dueDate, currentStatus) {
  if (currentStatus === "Cancelled") return "Cancelled";
  if (currentStatus === "Draft") return "Draft";
  if ((balanceDue || 0) <= 0) return "Paid";
  if ((amountPaid || 0) > 0) return "Partially Paid";
  if (dueDate && new Date() > new Date(dueDate + "T23:59:59")) return "Overdue";
  return "Due";
}

export function lineItemTotal(quantity, unitRate) {
  return Math.round((Number(quantity || 0) * Number(unitRate || 0)) * 100) / 100;
}