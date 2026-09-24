// Shared helpers — pure functions used across multiple backend functions.
// Ported from supabase/functions/_shared/helpers.ts — no Supabase dependency.

export function safeJson(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
}

export function round2(n) {
  const v = Number(n) || 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function generateSecureToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function filterTeamItems(items) {
  return (items || []).filter((it) => it.item_type === "team");
}

export function filterServiceItems(items) {
  return (items || []).filter((it) => it.item_type === "service");
}

export function calculateMilestoneAmount(milestone, grandTotal) {
  const value = Math.max(0, Number(milestone?.value) || 0);
  if (milestone?.type === "fixed") return round2(value);
  return round2((Number(grandTotal) || 0) * value / 100);
}

export function groupBy(arr, key) {
  const groups = {};
  for (const item of arr || []) {
    const k = item[key];
    if (!k) continue;
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

export function sumLineTotals(items) {
  return round2((items || []).reduce((s, it) => s + (Number(it.line_total) || 0), 0));
}

export function uniqueSortedDates(dates) {
  return [...new Set(dates)].filter(Boolean).sort();
}

export function deriveEventDates(quotation) {
  if (!quotation.start_date) return [];
  const excluded = new Set(quotation.excluded_dates || []);
  const start = new Date(quotation.start_date + "T00:00:00");
  const end = quotation.end_date
    ? new Date(quotation.end_date + "T00:00:00")
    : new Date(quotation.start_date + "T00:00:00");
  if (isNaN(start) || isNaN(end) || start > end) return [quotation.start_date].filter(Boolean);
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    if (!excluded.has(ds)) dates.push(ds);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function generateInvoiceNumber(supabaseAdmin, workspaceId) {
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

export function determineGstMode(businessState, clientState) {
  if (!businessState || !clientState) return "cgst_sgst";
  return businessState.trim().toLowerCase() === clientState.trim().toLowerCase()
    ? "cgst_sgst"
    : "igst";
}

export function computeInvoiceTotals(items, opts) {
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

export function buildClientSnapshot(client) {
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

export function buildBusinessSnapshot(workspace) {
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

export function buildEventSnapshot(event) {
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

export function getFinancialYearForDate(dateStr) {
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

export function getCurrentFinancialYear() {
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

export function findFYForDate(dateStr, fys) {
  if (!dateStr || !fys || !fys.length) return null;
  return fys.find((fy) => dateStr >= fy.start_date && dateStr <= fy.end_date) || null;
}

export function checkFYOverlap(startDate, endDate, existingFYs, excludeId) {
  return existingFYs.some(
    (fy) =>
      (!excludeId || fy.id !== excludeId) &&
      startDate <= fy.end_date &&
      endDate >= fy.start_date
  );
}