// Quotation + estimate calculation helpers for Phase 6.
// All money is stored as numbers and rounded to integers to avoid
// floating-point artefacts (₹8999.999999). Dates are date-only (YYYY-MM-DD).

// --- Rounding ----------------------------------------------------------------

export const roundMoney = (n) => Math.round(Number(n) || 0);

// --- Line totals -------------------------------------------------------------

// line_total = quantity × (days || 1) × unit_rate
export function lineTotal(item) {
  const qty = Math.max(0, Number(item?.quantity) || 0);
  const days = Math.max(0, Number(item?.days) || 0) || 1;
  const rate = Math.max(0, Number(item?.unit_rate) || 0);
  return roundMoney(qty * days * rate);
}

// --- Quotation totals --------------------------------------------------------

// Computes the full quotation totals from items + discount + GST settings.
// Supports per-item GST rates with proportional discount allocation.
export function computeQuotationTotals({
  items = [],
  discount_type = "percentage",
  discount_value = 0,
  gst_applicable = false,
  gst_mode = "cgst_sgst",
}) {
  const subtotal = roundMoney(
    items.reduce((s, i) => s + lineTotal(i), 0)
  );

  let discount_amount = 0;
  if (discount_type === "percentage") {
    const pct = Math.min(100, Math.max(0, Number(discount_value) || 0));
    discount_amount = roundMoney((subtotal * pct) / 100);
  } else {
    discount_amount = Math.min(subtotal, roundMoney(Number(discount_value) || 0));
  }

  const taxable_amount = roundMoney(subtotal - discount_amount);

  // Per-item GST with proportional discount allocation.
  let gst_total = 0;
  if (gst_applicable && subtotal > 0) {
    gst_total = roundMoney(
      items.reduce((sum, item) => {
        const lt = lineTotal(item);
        if (!lt) return sum;
        const proportion = lt / subtotal;
        const itemTaxable = roundMoney(taxable_amount * proportion);
        const rate = Number(item?.gst_rate) || 0;
        return sum + (itemTaxable * rate) / 100;
      }, 0)
    );
  }

  let cgst_amount = 0;
  let sgst_amount = 0;
  let igst_amount = 0;
  if (gst_applicable && gst_total > 0) {
    if (gst_mode === "igst") {
      igst_amount = gst_total;
    } else {
      cgst_amount = roundMoney(gst_total / 2);
      sgst_amount = roundMoney(gst_total - cgst_amount);
    }
  }

  const grand_total = roundMoney(taxable_amount + gst_total);

  return {
    subtotal,
    discount_amount,
    taxable_amount,
    gst_total,
    cgst_amount,
    sgst_amount,
    igst_amount,
    grand_total,
  };
}

// --- Estimate (Rate Estimator) totals ---------------------------------------

export function computeEstimateTotals({ items = [], markup_percent = 0 }) {
  const subtotal = roundMoney(
    items.reduce((s, i) => s + lineTotal(i), 0)
  );
  const teamCost = roundMoney(
    items
      .filter((i) => i.item_type === "role")
      .reduce((s, i) => s + lineTotal(i), 0)
  );
  const serviceCost = roundMoney(
    items
      .filter((i) => i.item_type !== "role")
      .reduce((s, i) => s + lineTotal(i), 0)
  );
  const markupAmount = roundMoney(
    (subtotal * (Math.max(0, Number(markup_percent) || 0))) / 100
  );
  const estimatedTotal = roundMoney(subtotal + markupAmount);
  return { subtotal, teamCost, serviceCost, markupAmount, estimatedTotal };
}

// --- Quotation numbering -----------------------------------------------------

// Generates the next quotation number: QT-YYYY-NNNN
// existingNumbers: array of quotation_number strings from the workspace.
export function nextQuotationNumber(existingNumbers = [], dateStr) {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const year = d.getFullYear();
  const prefix = `QT-${year}-`;
  let maxSeq = 0;
  (existingNumbers || []).forEach((num) => {
    if (num && num.startsWith(prefix)) {
      const seq = parseInt(num.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// --- Snapshots (for finalized quotation historical integrity) ---------------

export function buildClientSnapshot(client) {
  if (!client) return null;
  return {
    name: client.name || "",
    phone: client.phone || "",
    email: client.email || "",
    address: [client.address, client.city, client.state]
      .filter(Boolean)
      .join(", "),
  };
}

export function buildBusinessSnapshot(workspace) {
  if (!workspace) return null;
  return {
    name: workspace.name || "",
    logo: workspace.logo || "",
    address: [workspace.address, workspace.city, workspace.state, workspace.country]
      .filter(Boolean)
      .join(", "),
    phone: workspace.phone || "",
    email: workspace.email || "",
    gst_business_name: workspace.gst_business_name || "",
    gstin: workspace.gstin || "",
    gst_billing_address: workspace.gst_billing_address || "",
    gst_state: workspace.gst_state || "",
  };
}

export function buildEventSnapshot(event) {
  if (!event) return null;
  return {
    title: event.title || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    venue: event.venue || "",
    venue_address: event.venue_address || "",
  };
}

// --- Validation helpers ------------------------------------------------------

export const isValidPositiveNumber = (v) => {
  const n = Number(v);
  return !Number.isNaN(n) && n > 0;
};

export const isValidNonNegativeNumber = (v) => {
  const n = Number(v);
  return !Number.isNaN(n) && n >= 0;
};

// Basic GSTIN format check: 15 chars, alphanumeric. Not statutory verification.
export const isValidGstinFormat = (gstin) => {
  if (!gstin) return false;
  return /^[0-9A-Z]{15}$/.test(gstin.trim());
};

// --- Filename sanitisation ---------------------------------------------------

export function sanitizeFilename(str) {
  return String(str || "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}