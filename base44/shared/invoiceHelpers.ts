// Shared invoice helper functions used by multiple backend functions.
// Extracted to avoid duplication between createInvoiceFromQuotation, getPublicInvoice, etc.

export function round2(n: number): number {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// Generate a 48-character hex token using Web Crypto API
export function generateSecureToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate workspace-specific invoice number: INV-YYYY-0001
// Finds the max existing number for the year and increments.
// Called server-side to prevent race-condition duplicates.
export async function generateInvoiceNumber(base44: any, workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const list = await base44.entities.Invoice.filter(
    { workspace_id: workspaceId }, "-invoice_number", 500
  );
  let max = 0;
  for (const inv of list || []) {
    const num = String(inv.invoice_number || "");
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// Determine GST mode (CGST+SGST vs IGST) based on business state vs client state.
// Same state → CGST+SGST; different state → IGST.
export function determineGstMode(businessState: string, clientState: string): "cgst_sgst" | "igst" {
  if (!businessState || !clientState) return "cgst_sgst";
  return businessState.trim().toLowerCase() === clientState.trim().toLowerCase()
    ? "cgst_sgst"
    : "igst";
}

// Calculate invoice totals from items + options.
// Items: [{ quantity, unit_rate }]  (packages use unit_rate as fixed price)
// Returns: { subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, gstTotal, grandTotal }
export function computeInvoiceTotals(items: any[], opts: {
  discountType?: string;
  discountValue?: number;
  gstApplicable?: boolean;
  gstRate?: number;
  gstMode?: string;
}): any {
  const subtotal = round2((items || []).reduce((s, it) => {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const rate = Math.max(0, Number(it.unit_rate) || 0);
    return s + round2(qty * rate);
  }, 0));

  const dType = opts.discountType || "percent";
  const dVal = Math.max(0, Number(opts.discountValue) || 0);
  let discountAmount = 0;
  if (dType === "fixed") {
    discountAmount = round2(Math.min(dVal, subtotal));
  } else {
    const pct = Math.min(Math.max(dVal, 0), 100);
    discountAmount = round2((subtotal * pct) / 100);
  }

  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));

  let cgst = 0, sgst = 0, igst = 0, gstTotal = 0;
  if (opts.gstApplicable) {
    const rate = Math.max(0, Number(opts.gstRate) || 0);
    gstTotal = round2((taxableAmount * rate) / 100);
    const mode = opts.gstMode || "cgst_sgst";
    if (mode === "igst") {
      igst = gstTotal;
    } else {
      cgst = round2(gstTotal / 2);
      sgst = round2(gstTotal - cgst);
    }
  }

  const grandTotal = round2(taxableAmount + gstTotal);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    gstTotal,
    grandTotal
  };
}

// Convert a number to words (Indian numbering system).
// Example: 10500 → "Ten Thousand Five Hundred Only"
export function amountToWords(num: number): string {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const r = num % 100;
    let str = "";
    if (h > 0) str += ones[h] + " Hundred";
    if (r > 0) str += (h > 0 ? " " : "") + twoDigits(r);
    return str;
  }

  function convert(num: number): string {
    if (num === 0) return "";
    const crore = Math.floor(num / 10000000);
    num = num % 10000000;
    const lakh = Math.floor(num / 100000);
    num = num % 100000;
    const thousand = Math.floor(num / 1000);
    num = num % 1000;
    const remainder = num;

    let str = "";
    if (crore > 0) str += convert(crore) + " Crore ";
    if (lakh > 0) str += twoDigits(lakh) + " Lakh ";
    if (thousand > 0) str += twoDigits(thousand) + " Thousand ";
    if (remainder > 0) str += threeDigits(remainder);
    return str.trim();
  }

  return convert(n) + " Only";
}

// Derive invoice status from amount_paid, balance_due, due_date, and current status.
// Does NOT auto-mark as paid — only actual payments update amount_paid.
export function deriveInvoiceStatus(invoice: any): string {
  const total = Number(invoice?.grand_total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  const balance = round2(Math.max(0, total - paid));
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = invoice?.due_date || "";
  const currentStatus = invoice?.status || "draft";

  if (currentStatus === "cancelled") return "cancelled";
  if (currentStatus === "draft") return "draft";

  if (balance <= 0 && total > 0) return "paid";
  if (paid > 0 && balance > 0) return "partial";

  // No payment yet — check due date
  if (dueDate && dueDate < today) return "overdue";
  return currentStatus === "sent" ? "sent" : "due";
}

// Build a client snapshot JSON string from a client entity.
export function buildClientSnapshot(client: any): string {
  if (!client) return "";
  return JSON.stringify({
    name: client.name || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    city: client.city || "",
    state: client.state || "",
    country: client.country || "",
    gstin: client.gstin || ""
  });
}

// Build a business snapshot JSON string from a workspace entity.
export function buildBusinessSnapshot(workspace: any): string {
  if (!workspace) return "";
  return JSON.stringify({
    name: workspace.name || "",
    logo: workspace.logo || "",
    address: workspace.address || "",
    city: workspace.city || "",
    state: workspace.state || "",
    country: workspace.country || "",
    phone: workspace.phone || "",
    email: workspace.email || "",
    gst_enabled: !!workspace.gst_enabled,
    gstin: workspace.gstin || "",
    gst_business_name: workspace.gst_business_name || "",
    gst_billing_address: workspace.gst_billing_address || "",
    gst_state: workspace.gst_state || "",
    default_gst_rate: workspace.default_gst_rate ?? 0
  });
}

// Build an event snapshot JSON string from an event entity.
export function buildEventSnapshot(event: any): string {
  if (!event) return "";
  return JSON.stringify({
    title: event.title || "",
    event_type: event.event_type || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    venue: event.venue || "",
    venue_address: event.venue_address || ""
  });
}