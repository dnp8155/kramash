// Shared helpers — pure functions used across multiple Edge Functions.
// No Supabase dependency; safe to import anywhere.

// Safe JSON parse — handles both string (Base44) and object (Supabase JSONB) values
export function safeJson<T = any>(v: any): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v as T;
  try { return JSON.parse(v) as T; } catch { return null; }
}

export function round2(n: number): number {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function generateSecureToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ===== Quotation helpers =====

export function filterTeamItems(items: any[]): any[] {
  return (items || []).filter((it) => it.item_type === "team");
}

export function filterServiceItems(items: any[]): any[] {
  return (items || []).filter((it) => it.item_type === "service");
}

export function calculateMilestoneAmount(milestone: any, grandTotal: number): number {
  const value = Math.max(0, Number(milestone?.value) || 0);
  if (milestone?.type === "fixed") return round2(value);
  return round2((Number(grandTotal) || 0) * value / 100);
}

export function groupBy(arr: any[], key: string): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const item of arr || []) {
    const k = item[key];
    if (!k) continue;
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

export function sumLineTotals(items: any[]): number {
  return round2((items || []).reduce((s, it) => s + (Number(it.line_total) || 0), 0));
}

export function uniqueSortedDates(dates: string[]): string[] {
  return [...new Set(dates)].filter(Boolean).sort();
}

export function deriveEventDates(quotation: any): string[] {
  if (!quotation.start_date) return [];
  const excluded = new Set(quotation.excluded_dates || []);
  const start = new Date(quotation.start_date + "T00:00:00");
  const end = quotation.end_date
    ? new Date(quotation.end_date + "T00:00:00")
    : new Date(quotation.start_date + "T00:00:00");
  if (isNaN(start) || isNaN(end) || start > end) return [quotation.start_date].filter(Boolean);
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    if (!excluded.has(ds)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ===== Invoice helpers =====

export async function generateInvoiceNumber(supabaseAdmin: any, workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabaseAdmin
    .from("invoices")
    .select("invoice_number")
    .eq("workspace_id", workspaceId)
    .order("invoice_number", { ascending: false })
    .limit(500);
  let max = 0;
  for (const inv of data || []) {
    const num = String(inv.invoice_number || "");
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function determineGstMode(businessState: string, clientState: string): "cgst_sgst" | "igst" {
  if (!businessState || !clientState) return "cgst_sgst";
  return businessState.trim().toLowerCase() === clientState.trim().toLowerCase()
    ? "cgst_sgst"
    : "igst";
}

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

  if (dueDate && dueDate < today) return "overdue";
  return currentStatus === "sent" ? "sent" : "due";
}

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

export function buildEventSnapshot(event: any): string {
  if (!event) return "";
  return JSON.stringify({
    title: event.title || "",
    event_type: event.event_type || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    event_dates: Array.isArray(event.event_dates) ? event.event_dates : [],
    venue: event.venue || "",
    venue_address: event.venue_address || ""
  });
}

// ===== Financial Year helpers =====

export function getFinancialYearForDate(dateStr: string): { name: string; start_date: string; end_date: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    name: `FY ${startYear}\u2013${String(endYear).slice(-2)}`,
    start_date: `${startYear}-04-01`,
    end_date: `${endYear}-03-31`,
  };
}

export function getCurrentFinancialYear(): { name: string; start_date: string; end_date: string } {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const today = `${d.getFullYear()}-${m}-${day}`;
  return getFinancialYearForDate(today) || (() => {
    const year = d.getFullYear();
    const startYear = d.getMonth() + 1 >= 4 ? year : year - 1;
    const endYear = startYear + 1;
    return {
      name: `FY ${startYear}\u2013${String(endYear).slice(-2)}`,
      start_date: `${startYear}-04-01`,
      end_date: `${endYear}-03-31`,
    };
  })();
}

export function findFYForDate(dateStr: string, fys: any[]): any | null {
  if (!dateStr || !fys || !fys.length) return null;
  return fys.find((fy) => dateStr >= fy.start_date && dateStr <= fy.end_date) || null;
}

export function checkFYOverlap(startDate: string, endDate: string, existingFYs: any[], excludeId?: string): boolean {
  return existingFYs.some(
    (fy) =>
      (!excludeId || fy.id !== excludeId) &&
      startDate <= fy.end_date &&
      endDate >= fy.start_date
  );
}

// ===== Date formatting =====

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISODate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatDatesList(datesArray: string[] | null | undefined): string {
  if (!Array.isArray(datesArray) || datesArray.length === 0) return "—";
  const parsed = datesArray
    .map(parseISODate)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) return "—";

  const first = parsed[0];
  const sameYear = parsed.every((d) => d.getFullYear() === first.getFullYear());

  const groups: { key: string; year: number; month: number; days: number[] }[] = [];
  for (const d of parsed) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(d.getDate());
    } else {
      groups.push({ key, year: d.getFullYear(), month: d.getMonth(), days: [d.getDate()] });
    }
  }

  const parts = groups.map((g) => {
    const daysStr = g.days.join(", ");
    const monthYear = sameYear ? MONTHS[g.month] : `${MONTHS[g.month]} ${g.year}`;
    return `${daysStr} ${monthYear}`;
  });

  return parts.join(", ") + (sameYear ? ` ${first.getFullYear()}` : "");
}

// ===== Number to words (Indian) =====

export function numberToIndianWords(num: number): string {
  if (num === 0) return "Zero";
  let result = "";
  let n = Math.floor(Math.abs(num));
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function twoD(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function threeD(n: number): string {
    let str = "";
    if (n >= 100) str += twoD(Math.floor(n / 100)) + " Hundred ";
    n %= 100;
    if (n > 0) str += twoD(n);
    return str.trim();
  }
  if (crore > 0) result += twoD(crore) + " Crore ";
  if (lakh > 0) result += twoD(lakh) + " Lakh ";
  if (thousand > 0) result += twoD(thousand) + " Thousand ";
  if (hundred > 0) result += threeD(hundred);
  return result.trim();
}

export function amountInWords(amount: number, currency = "INR"): string {
  const rupees = Math.floor(Math.abs(amount || 0));
  const paise = Math.round((Math.abs(amount || 0) - rupees) * 100);
  let words = numberToIndianWords(rupees);
  if (paise > 0) words += " and " + numberToIndianWords(paise) + " Paise";
  return `Rupees ${words} Only`;
}