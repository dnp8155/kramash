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
// Uses the selected HTML template (default: classic_minimal — simple B&W)
// rendered to PDF via html2canvas + jsPDF for a clean, print-faithful output.

import { renderTemplate } from "@/constants/quotationTemplates";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";

export async function generateQuotationPdf({
  quotation,
  items,
  workspace,
  client,
  event,
  currency = "INR",
  returnBlob = false
}) {
  let templateConfig = {};
  try { templateConfig = quotation.template_config ? JSON.parse(quotation.template_config) : {}; } catch (e) {}

  const templateId = quotation.template_id || "black_premium";
  const html = renderTemplate(templateId, {
    workspace,
    quotation,
    client,
    event,
    items,
    currency,
    templateConfig
  });

  const fname = `Kramasha_${quotation.quotation_number || "Quotation"}_${sanitizeFilename(client?.name || "Client")}.pdf`;
  return generateTemplatePdf(html, { filename: fname, returnBlob });
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