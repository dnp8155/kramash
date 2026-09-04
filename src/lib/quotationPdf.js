// Phase 6 branded PDF generation for quotations and team job sheets.
// Uses jsPDF programmatic layout for crisp text and reliable multi-page handling.

import { jsPDF } from "jspdf";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { parseSnapshot } from "@/lib/quotationService";
import { formatEventDate } from "@/lib/dates";
import { getBusinessTerminology } from "@/lib/businessTerminology";

const PRIMARY = [31, 56, 92];
const MUTED = [110, 120, 135];
const LIGHT = [245, 247, 250];
const BORDER = [210, 218, 228];

function symbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency || "₹";
}

function money(n, currency) {
  const v = Number(n) || 0;
  return symbol(currency) + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money0(n, currency) {
  const v = Number(n) || 0;
  return symbol(currency) + v.toLocaleString("en-IN");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Load an image URL into a data URL for jsPDF. Returns null on failure.
async function loadImageDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

// Determine image format for jsPDF from data URL.
function imgFormat(dataUrl) {
  if (!dataUrl) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

function sanitizeFilename(s) {
  return String(s || "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-");
}

// ---- Quotation PDF ----

export async function generateQuotationPdf({
  quotation,
  items,
  workspace,
  client,
  event,
  currency = "INR",
  returnBlob = false
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;
  const contentW = pageW - M * 2;
  const term = getBusinessTerminology(workspace);

  // Prefer finalized snapshots, fall back to live objects.
  const biz = parseSnapshot(quotation.business_snapshot) || {
    name: workspace?.name,
    logo: workspace?.logo,
    address: workspace?.address,
    city: workspace?.city,
    state: workspace?.state,
    country: workspace?.country,
    phone: workspace?.phone,
    email: workspace?.email,
    gst_enabled: workspace?.gst_enabled,
    gstin: workspace?.gstin,
    gst_business_name: workspace?.gst_business_name,
    gst_billing_address: workspace?.gst_billing_address,
    gst_state: workspace?.gst_state
  };
  const cli = parseSnapshot(quotation.client_snapshot) || {
    name: client?.name,
    phone: client?.phone,
    email: client?.email,
    address: client?.address,
    city: client?.city,
    state: client?.state
  };
  const evSnap = parseSnapshot(quotation.event_snapshot) || {
    title: event?.title,
    start_date: event?.start_date,
    end_date: event?.end_date,
    venue: event?.venue,
    venue_address: event?.venue_address
  };

  let y = M;

  // ---- Header ----
  const logoData = await loadImageDataUrl(biz.logo);
  if (logoData) {
    try {
      doc.addImage(logoData, imgFormat(logoData), M, y, 26, 26);
    } catch (e) {
      /* skip logo */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PRIMARY);
  doc.text(biz.name || "Business Name", M + 32, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let addrLine = [biz.address, biz.city, biz.state, biz.country].filter(Boolean).join(", ");
  if (addrLine) doc.text(addrLine, M + 32, y + 11);
  const contactLine = [biz.phone, biz.email].filter(Boolean).join("  ·  ");
  if (contactLine) doc.text(contactLine, M + 32, y + 15.5);

  // Quotation title + number (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.text("QUOTATION", pageW - M, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`No: ${quotation.quotation_number}`, pageW - M, y + 11, { align: "right" });
  doc.text(`Date: ${fmtDate(quotation.quotation_date)}`, pageW - M, y + 16, { align: "right" });
  if (quotation.valid_until) {
    doc.text(`Valid Until: ${fmtDate(quotation.valid_until)}`, pageW - M, y + 21, { align: "right" });
  }

  y += 32;
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);
  y += 6;

  // ---- Bill To + Event ----
  const colW = contentW / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("BILL TO", M, y);
  if (evSnap.title) doc.text(term.quotationSectionLabel || "EVENT", M + colW, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  let cy = y + 5;
  doc.setFont("helvetica", "bold");
  doc.text(cli.name || "—", M, cy);
  doc.setFont("helvetica", "normal");
  if (evSnap.title) {
    doc.setFont("helvetica", "bold");
    doc.text(evSnap.title, M + colW, cy);
    doc.setFont("helvetica", "normal");
  }
  cy += 5;
  const cliLines = [
    cli.address,
    [cli.city, cli.state].filter(Boolean).join(", "),
    cli.phone,
    cli.email
  ].filter(Boolean);
  const evLines = [
    formatEventDate(evSnap.start_date, evSnap.end_date),
    evSnap.venue,
    evSnap.venue_address
  ].filter(Boolean);
  const maxLines = Math.max(cliLines.length, evLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (cliLines[i]) doc.text(cliLines[i], M, cy);
    if (evLines[i]) doc.text(evLines[i], M + colW, cy);
    cy += 5;
  }
  y = cy + 4;

  // ---- Items table ----
  const showPricing = quotation.show_pricing !== false;
  let cols;
  if (showPricing) {
    cols = [
      { label: "#", x: M, w: 8, align: "left" },
      { label: "Description", x: M + 8, w: contentW - 8 - 22 - 24 - 26, align: "left" },
      { label: "Qty", x: pageW - M - 22 - 24 - 26, w: 22, align: "center" },
      { label: "Rate", x: pageW - M - 24 - 26, w: 24, align: "right" },
      { label: "Amount", x: pageW - M - 26, w: 26, align: "right" }
    ];
  } else {
    cols = [
      { label: "#", x: M, w: 8, align: "left" },
      { label: "Description", x: M + 8, w: contentW - 8, align: "left" }
    ];
  }

  function drawTableHeader() {
    doc.setFillColor(...PRIMARY);
    doc.rect(M, y, contentW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    for (const c of cols) {
      doc.text(c.label, c.align === "right" ? c.x + c.w : c.x + 1.5, y + 5.5, { align: c.align });
    }
    y += 8;
  }

  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let idx = 1;
  for (const it of items || []) {
    const descW = cols[1].w - 3;
    let descText = it.name || "";
    if (it.description) descText += " — " + it.description;
    if (it.team_member_name_snapshot) descText += " (" + it.team_member_name_snapshot + ")";
    const descLines = doc.splitTextToSize(descText, descW);
    const rh = Math.max(8, descLines.length * 4.5 + 3.5);
    if (y + rh > pageH - M - 10) {
      doc.addPage();
      y = M;
      drawTableHeader();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(M, y, contentW, rh, "F");
    }
    doc.setTextColor(0, 0, 0);
    doc.text(String(idx), cols[0].x + 1.5, y + 5);
    doc.text(descLines, cols[1].x + 1.5, y + 5);
    if (showPricing) {
      const qtyStr = it.rate_type === "Per Day"
        ? `${Number(it.quantity) || 0} × ${Number(it.days) || 1}d`
        : `${Number(it.quantity) || 0}`;
      doc.text(qtyStr, cols[2].x + cols[2].w / 2, y + 5, { align: "center" });
      doc.text(money(it.unit_rate, currency), cols[3].x + cols[3].w - 1.5, y + 5, { align: "right" });
      doc.text(money(it.line_total, currency), cols[4].x + cols[4].w - 1.5, y + 5, { align: "right" });
    }
    y += rh;
    idx++;
  }
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);
  y += 5;

  // ---- Totals ----
  const totalsX = pageW - M - 70;
  const totalsW = 70;
  function totalRow(label, value, opts = {}) {
    if (y > pageH - M - 10) {
      doc.addPage();
      y = M;
    }
    if (opts.bold) {
      doc.setFillColor(...PRIMARY);
      doc.rect(totalsX, y, totalsW, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    }
    doc.setFontSize(9);
    doc.text(label, totalsX + 2, y + 5.5);
    doc.text(money(value, currency), totalsX + totalsW - 2, y + 5.5, { align: "right" });
    y += 8;
  }

  totalRow("Subtotal", quotation.subtotal);
  if (Number(quotation.discount_amount) > 0) {
    totalRow(`Discount (${quotation.discount_type === "percent" ? quotation.discount_value + "%" : "Fixed"})`, -quotation.discount_amount);
  }
  totalRow("Taxable Amount", quotation.taxable_amount);
  if (quotation.gst_applicable) {
    if (quotation.gst_mode === "igst") {
      totalRow("IGST", quotation.igst_amount);
    } else {
      totalRow("CGST", quotation.cgst_amount);
      totalRow("SGST", quotation.sgst_amount);
    }
  }
  totalRow("Grand Total", quotation.grand_total, { bold: true });

  // ---- Milestones ----
  let milestones = [];
  try { milestones = quotation.milestones || (quotation.payment_schedule_json ? JSON.parse(quotation.payment_schedule_json) : []); } catch (e) {}
  if (milestones && milestones.length > 0) {
    if (y > pageH - M - 20) { doc.addPage(); y = M; }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("PAYMENT MILESTONES", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    for (const m of milestones) {
      if (!m.name) continue;
      if (y > pageH - M - 8) { doc.addPage(); y = M; }
      const amt = m.type === "percent"
        ? Math.round((Number(m.value || 0) / 100) * (quotation.grand_total || 0) * 100) / 100
        : Math.round(Number(m.value || 0) * 100) / 100;
      const pct = quotation.grand_total > 0 ? Math.round((amt / quotation.grand_total) * 100) : "";
      const label = (pct ? pct + "% — " : "") + m.name;
      doc.text(label, M, y);
      doc.text(money(amt, currency), pageW - M, y, { align: "right" });
      y += 5;
    }
  }

  // ---- Bank / UPI details ----
  let bank = null;
  try { bank = quotation.bank_details || (quotation.bank_details_snapshot ? JSON.parse(quotation.bank_details_snapshot) : null); } catch (e) {}
  if (bank) {
    const bankFields = [
      { l: "Account Name", v: bank.account_name || bank.name },
      { l: "Bank Name", v: bank.bank_name || bank.bank },
      { l: "Account Number", v: bank.account_number },
      { l: "IFSC", v: bank.ifsc },
      { l: "UPI ID", v: bank.upi_id || bank.upi }
    ].filter((f) => f.v);
    if (bankFields.length > 0) {
      if (y > pageH - M - 20) { doc.addPage(); y = M; }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text("BANK / UPI DETAILS", M, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      for (const f of bankFields) {
        if (y > pageH - M - 5) { doc.addPage(); y = M; }
        doc.text(f.l + ":", M, y);
        doc.text(String(f.v), M + 35, y);
        y += 5;
      }
    }
  }

  // ---- Social links ----
  let social = null;
  try { social = quotation.social_links || (quotation.social_links_snapshot ? JSON.parse(quotation.social_links_snapshot) : null); } catch (e) {}
  if (social) {
    const socialItems = [
      { l: "Instagram", v: social.instagram },
      { l: "Website", v: social.website },
      { l: "YouTube", v: social.youtube }
    ].filter((s) => s.v);
    if (socialItems.length > 0) {
      if (y > pageH - M - 15) { doc.addPage(); y = M; }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text("CONNECT WITH US", M, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      for (const s of socialItems) {
        if (y > pageH - M - 5) { doc.addPage(); y = M; }
        doc.text(s.l + ":", M, y);
        doc.text(String(s.v), M + 25, y);
        y += 5;
      }
    }
  }

  // ---- GST business block (if applicable) ----
  if (quotation.gst_applicable && biz.gstin) {
    if (y > pageH - M - 20) { doc.addPage(); y = M; }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("GST DETAILS", M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    y += 5;
    if (biz.gst_business_name) { doc.text(biz.gst_business_name, M, y); y += 5; }
    doc.text(`GSTIN: ${biz.gstin}`, M, y); y += 5;
    if (biz.gst_billing_address) { doc.text(biz.gst_billing_address, M, y); y += 5; }
    if (biz.gst_state) { doc.text(`State: ${biz.gst_state}`, M, y); y += 5; }
  }

  // ---- Terms ----
  if (quotation.terms_and_conditions) {
    if (y > pageH - M - 25) { doc.addPage(); y = M; }
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("TERMS & CONDITIONS", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 85);
    const termLines = doc.splitTextToSize(quotation.terms_and_conditions, contentW);
    for (const line of termLines) {
      if (y > pageH - M - 5) { doc.addPage(); y = M; }
      doc.text(line, M, y);
      y += 4.5;
    }
  }

  if (quotation.notes) {
    if (y > pageH - M - 15) { doc.addPage(); y = M; }
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("NOTES", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 85);
    const noteLines = doc.splitTextToSize(quotation.notes, contentW);
    for (const line of noteLines) {
      if (y > pageH - M - 5) { doc.addPage(); y = M; }
      doc.text(line, M, y);
      y += 4.5;
    }
  }

  // ---- Footer page numbers ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `${biz.name || ""}  ·  ${quotation.quotation_number}`,
      M, pageH - 6
    );
    doc.text(`Page ${p} of ${pageCount}`, pageW - M, pageH - 6, { align: "right" });
  }

  const fname = `Kramasha_${quotation.quotation_number}_${sanitizeFilename(cli.name || "Client")}.pdf`;
  if (returnBlob) {
    return { url: doc.output("bloburl"), filename: fname };
  }
  doc.save(fname);
  return true;
}

// ---- Job Sheet PDF (team-facing, no financials) ----

export async function generateJobSheetPdf({
  event,
  assignments,
  members,
  roles,
  workspace,
  currency = "INR",
  returnBlob = false
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;
  const contentW = pageW - M * 2;
  const term = getBusinessTerminology(workspace);

  let y = M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PRIMARY);
  doc.text(workspace?.name || "Business Name", M, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const contactLine = [workspace?.phone, workspace?.email].filter(Boolean).join("  ·  ");
  if (contactLine) doc.text(contactLine, M, y + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.text("JOB SHEET", pageW - M, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${fmtDate(todayISO())}`, pageW - M, y + 11, { align: "right" });

  y += 20;
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);
  y += 6;

  // Event block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(event?.title || term.workItemSingular || "Event", M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const evLines = [
    formatEventDate(event?.start_date, event?.end_date),
    event?.venue,
    event?.venue_address
  ].filter(Boolean);
  for (const line of evLines) { doc.text(line, M, y); y += 5; }

  y += 4;
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);
  y += 6;

  // Team table
  const cols = [
    { label: "#", x: M, w: 8 },
    { label: "Member", x: M + 8, w: 60 },
    { label: "Role", x: M + 68, w: 55 },
    { label: "Contact", x: M + 123, w: contentW - 123 }
  ];
  doc.setFillColor(...PRIMARY);
  doc.rect(M, y, contentW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  for (const c of cols) doc.text(c.label, c.x + 1.5, y + 5.5);
  y += 8;

  const membersById = {};
  for (const m of members || []) membersById[m.id] = m;
  const rolesById = {};
  for (const r of roles || []) rolesById[r.id] = r;
  const active = (assignments || []).filter((a) => a.assignment_status !== "removed");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let idx = 1;
  for (const a of active) {
    const m = membersById[a.team_member_id] || {};
    const roleName = a.role_name_snapshot || rolesById[a.role_id]?.name || m.profession || "—";
    if (y > pageH - M - 10) { doc.addPage(); y = M; }
    if (idx % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(M, y, contentW, 8, "F"); }
    doc.setTextColor(0, 0, 0);
    doc.text(String(idx), cols[0].x + 1.5, y + 5.5);
    doc.text(m.name || "—", cols[1].x + 1.5, y + 5.5);
    doc.text(roleName, cols[2].x + 1.5, y + 5.5);
    doc.text(m.phone || "", cols[3].x + 1.5, y + 5.5);
    y += 8;
    idx++;
  }
  if (active.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text("No team members assigned.", M, y + 5);
    y += 8;
  }
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);

  // Notes
  if (event?.notes) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("NOTES", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 70, 85);
    const noteLines = doc.splitTextToSize(event.notes, contentW);
    for (const line of noteLines) {
      if (y > pageH - M - 5) { doc.addPage(); y = M; }
      doc.text(line, M, y);
      y += 4.5;
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Job Sheet · ${event?.title || ""}`, M, pageH - 6);
    doc.text(`Page ${p} of ${pageCount}`, pageW - M, pageH - 6, { align: "right" });
  }

  const jsFname = `Kramasha_JobSheet_${sanitizeFilename(event?.title || term.workItemSingular || "Event")}.pdf`;
  if (returnBlob) {
    return { url: doc.output("bloburl"), filename: jsFname };
  }
  doc.save(jsFname);
  return true;
}