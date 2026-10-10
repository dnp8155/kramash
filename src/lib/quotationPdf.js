// Phase 6 branded PDF generation for quotations and team job sheets.
// Uses jsPDF programmatic layout for crisp text and reliable multi-page handling.

import { jsPDF } from "jspdf";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { parseSnapshot } from "@/lib/quotationService";
import { formatEventDates, formatAssignedDates } from "@/lib/dates";
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
  return String(s || "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-").slice(0, 40);
}

// ---- Quotation PDF ----
// Uses the selected HTML template (default: classic_minimal — simple B&W)
// rendered to PDF via html2canvas + jsPDF for a clean, print-faithful output.

import { renderTemplate, getTemplate } from "@/constants/quotationTemplates";
import { prepareTemplateImages } from "@/lib/templateImages";
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
  // Pictures from web links: loaded up front; any that can't be are simply left out of the PDF.
  if (getTemplate(templateId).supportsImages) {
    templateConfig = (await prepareTemplateImages(templateConfig, { publicToken: quotation.public_token || "" })).templateConfig;
  }
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

// Before a quotation is accepted/synced there are no event assignments yet, so the sheet falls back to
// the quotation's own team and service items (quotationItems). Once an event exists, its real
// assignments win.
export async function generateJobSheetPdf({
  event,
  assignments,
  serviceAssignments = [],
  quotationItems = [],
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
    formatEventDates(event),
    event?.venue,
    event?.venue_address
  ].filter(Boolean);
  for (const line of evLines) { doc.text(line, M, y); y += 5; }

  y += 4;
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);
  y += 6;

  // Team table — who is on which dates and which side (Bride / Groom …)
  const cols = [
    { label: "#", x: M, w: 8 },
    { label: "Member", x: M + 8, w: 38 },
    { label: "Role", x: M + 46, w: 36 },
    { label: "Side", x: M + 82, w: 26 },
    { label: "Date(s)", x: M + 108, w: 44 },
    { label: "Contact", x: M + 152, w: contentW - 152 }
  ];
  const drawTeamHeader = () => {
    doc.setFillColor(...PRIMARY);
    doc.rect(M, y, contentW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    for (const c of cols) doc.text(c.label, c.x + 1.5, y + 5.5);
    y += 8;
  };
  drawTeamHeader();

  const membersById = {};
  for (const m of members || []) membersById[m.id] = m;
  const rolesById = {};
  for (const r of roles || []) rolesById[r.id] = r;
  let active = (assignments || []).filter((a) => a.assignment_status !== "removed");
  if (active.length === 0) {
    // No event assignments yet: one row per member + role + side, with every day they're quoted on.
    const rows = new Map();
    for (const it of quotationItems || []) {
      if (it.item_type !== "team") continue;
      const key = `${it.team_member_id || it.name}|${it.description || ""}|${it.member_type || ""}`;
      if (!rows.has(key)) {
        rows.set(key, { team_member_id: it.team_member_id, role_name_snapshot: it.description || "", member_type_snapshot: it.member_type || "", _name: it.team_member_name_snapshot || it.name || "", working_dates: [] });
      }
      if (it.day_date) rows.get(key).working_dates.push(it.day_date);
    }
    active = [...rows.values()].map((r) => ({ ...r, working_dates: [...new Set(r.working_dates)].sort() }));
  }
  // Group by side so each side's crew sits together.
  active = [...active].sort((a, b) => String(a.member_type_snapshot || "").localeCompare(String(b.member_type_snapshot || "")));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let idx = 1;
  for (const a of active) {
    const m = membersById[a.team_member_id] || {};
    const roleName = a.role_name_snapshot || rolesById[a.role_id]?.name || m.profession || "—";
    const cells = [
      String(idx),
      doc.splitTextToSize(m.name || a._name || "—", cols[1].w - 3),
      doc.splitTextToSize(roleName, cols[2].w - 3),
      doc.splitTextToSize(a.member_type_snapshot || "—", cols[3].w - 3),
      doc.splitTextToSize(formatAssignedDates(a, event) || "—", cols[4].w - 3),
      doc.splitTextToSize(m.phone || "", cols[5].w - 3)
    ];
    const lines = Math.max(1, ...cells.slice(1).map((c) => c.length));
    const rowH = Math.max(8, lines * 4.2 + 3.8);
    if (y + rowH > pageH - M - 10) { doc.addPage(); y = M; drawTeamHeader(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); }
    if (idx % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(M, y, contentW, rowH, "F"); }
    doc.setTextColor(0, 0, 0);
    cells.forEach((c, k) => doc.text(c, cols[k].x + 1.5, y + 5.5));
    y += rowH;
    idx++;
  }
  if (active.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text("No team members assigned.", M, y + 5);
    y += 8;
  }
  doc.setDrawColor(...BORDER);
  doc.line(M, y, pageW - M, y);

  // Services
  let svcRows = (serviceAssignments || [])
    .filter((a) => a.assignment_status !== "removed")
    .map((a) => ({ name: a.service_name_snapshot || "Service", provider: a.provider_name_snapshot || "" }));
  if (svcRows.length === 0) {
    svcRows = (quotationItems || [])
      .filter((it) => it.item_type === "service")
      .map((it) => ({ name: it.name || "Service", provider: "" }));
  }
  if (svcRows.length > 0) {
    y += 8;
    if (y > pageH - M - 30) { doc.addPage(); y = M; }
    const sCols = [
      { label: "#", x: M, w: 8 },
      { label: "Service", x: M + 8, w: 115 },
      { label: "Provider", x: M + 123, w: contentW - 123 }
    ];
    doc.setFillColor(...PRIMARY);
    doc.rect(M, y, contentW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    for (const c of sCols) doc.text(c.label, c.x + 1.5, y + 5.5);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    svcRows.forEach((s, i) => {
      if (y > pageH - M - 10) { doc.addPage(); y = M; }
      if ((i + 1) % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(M, y, contentW, 8, "F"); }
      doc.setTextColor(0, 0, 0);
      doc.text(String(i + 1), sCols[0].x + 1.5, y + 5.5);
      doc.text(doc.splitTextToSize(s.name, sCols[1].w - 3)[0] || "", sCols[1].x + 1.5, y + 5.5);
      doc.text(s.provider, sCols[2].x + 1.5, y + 5.5);
      y += 8;
    });
    doc.setDrawColor(...BORDER);
    doc.line(M, y, pageW - M, y);
  }

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