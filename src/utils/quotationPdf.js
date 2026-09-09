// Branded quotation PDF generator using jsPDF.
// Builds a clean, paginated, professional quotation document from saved
// quotation data + snapshots. Logo is embedded when CORS-permitting.

import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/utils/format";
import { sanitizeFilename } from "@/utils/quotation";

// Page geometry (A4 portrait, mm)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Load an image URL as a data URL via canvas (for jsPDF embedding).
// Returns null on any failure (CORS taint, network, etc.).
function loadImageDataUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateQuotationPDF({
  quotation,
  items = [],
  workspace,
  client,
  event,
  terminology,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Use finalized snapshots if available, otherwise live data.
  const biz = quotation.business_snapshot || {};
  const cli = quotation.client_snapshot || {};
  const evt = quotation.event_snapshot || {};

  const bizName = biz.name || workspace?.name || "Kramashah";
  const bizAddress = biz.address || [workspace?.address, workspace?.city, workspace?.state].filter(Boolean).join(", ") || "";
  const bizPhone = biz.phone || workspace?.phone || "";
  const bizEmail = biz.email || workspace?.email || "";
  const logoUrl = biz.logo || workspace?.logo || "";

  const gstApplicable = !!quotation.gst_applicable;
  const gstin = biz.gstin || workspace?.gstin || "";
  const gstBusinessName = biz.gst_business_name || workspace?.gst_business_name || "";
  const gstAddress = biz.gst_billing_address || workspace?.gst_billing_address || "";
  const gstState = biz.gst_state || workspace?.gst_state || "";

  const clientName = cli.name || client?.name || "—";
  const clientPhone = cli.phone || client?.phone || "";
  const clientEmail = cli.email || client?.email || "";
  const clientAddress = cli.address || "";

  const eventTitle = evt.title || event?.title || "";
  const eventDate = evt.start_date || event?.start_date || "";
  const eventVenue = evt.venue || event?.venue || "";

  // Terminology labels (with safe fallbacks)
  const workSingular = terminology?.workItemSingular || "Event";
  const locationLabel = terminology?.locationLabel || "Venue";
  const startDateLabel = terminology?.startDateLabel || "Date";

  let y = MARGIN;

  // --- Header: logo + business info ---
  let logoDataUrl = null;
  if (logoUrl) logoDataUrl = await loadImageDataUrl(logoUrl);

  if (logoDataUrl) {
    try {
      const logoW = 22;
      const logoH = 22;
      doc.addImage(logoDataUrl, "PNG", MARGIN, y, logoW, logoH, undefined, "FAST");
    } catch {
      // skip logo
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(bizName, MARGIN + 26, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const bizInfoLines = [bizAddress, bizPhone, bizEmail].filter(Boolean);
  bizInfoLines.forEach((line, i) => {
    doc.text(line, MARGIN + 26, y + 11 + i * 4);
  });

  // Quotation label (right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(69, 58, 128);
  doc.text("QUOTATION", PAGE_W - MARGIN, y + 6, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(quotation.quotation_number || "", PAGE_W - MARGIN, y + 12, { align: "right" });
  doc.text(`Date: ${formatDate(quotation.quotation_date)}`, PAGE_W - MARGIN, y + 17, { align: "right" });
  if (quotation.valid_until) {
    doc.text(`Valid Until: ${formatDate(quotation.valid_until)}`, PAGE_W - MARGIN, y + 22, { align: "right" });
  }

  y += Math.max(logoDataUrl ? 26 : 20, 26);

  // Divider
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // --- GST business block (if applicable) ---
  if (gstApplicable && (gstin || gstBusinessName)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text("GST REGISTERED BUSINESS", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const gstLines = [
      gstBusinessName && gstBusinessName !== bizName ? gstBusinessName : null,
      gstAddress || null,
      gstState ? `State: ${gstState}` : null,
      gstin ? `GSTIN: ${gstin}` : null,
    ].filter(Boolean);
    gstLines.forEach((line, i) => {
      doc.text(line, MARGIN, y + 4 + i * 3.5);
    });
    y += 4 + gstLines.length * 3.5 + 4;
  }

  // --- Bill To + Event ---
  const billToX = MARGIN;
  const eventX = PAGE_W / 2 + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("BILL TO", billToX, y);

  if (eventTitle) {
    doc.text(`${workSingular.toUpperCase()} DETAILS`, eventX, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const clientLines = [
    clientName,
    clientAddress,
    clientPhone,
    clientEmail,
  ].filter(Boolean);
  clientLines.forEach((line, i) => {
    const wrapped = doc.splitTextToSize(line, PAGE_W / 2 - MARGIN - 5);
    doc.text(wrapped, billToX, y + 4 + i * 4);
  });

  if (eventTitle) {
    const eventLines = [
      eventTitle,
      eventDate ? `${startDateLabel}: ${formatDate(eventDate)}` : null,
      eventVenue ? `${locationLabel}: ${eventVenue}` : null,
    ].filter(Boolean);
    eventLines.forEach((line, i) => {
      const wrapped = doc.splitTextToSize(line, PAGE_W / 2 - MARGIN - 5);
      doc.text(wrapped, eventX, y + 4 + i * 4);
    });
  }

  y += Math.max(clientLines.length, eventTitle ? 3 : 0) * 4 + 8;

  // --- Items table ---
  const tableY = y;
  const colX = {
    num: MARGIN,
    desc: MARGIN + 8,
    qty: MARGIN + 95,
    days: MARGIN + 112,
    rate: MARGIN + 130,
    amount: PAGE_W - MARGIN,
  };

  // Table header
  doc.setFillColor(245, 245, 248);
  doc.rect(MARGIN, tableY, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("#", colX.num, tableY + 4.5);
  doc.text("Description", colX.desc, tableY + 4.5);
  doc.text("Qty", colX.qty, tableY + 4.5);
  doc.text("Days", colX.days, tableY + 4.5);
  doc.text("Rate", colX.rate, tableY + 4.5);
  doc.text("Amount", colX.amount, tableY + 4.5, { align: "right" });

  y = tableY + 7;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  const sortedItems = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  sortedItems.forEach((item, idx) => {
    const rowH = 6;
    if (y + rowH > PAGE_H - MARGIN - 40) {
      doc.addPage();
      y = MARGIN;
    }
    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }
    doc.setTextColor(50, 50, 50);
    doc.text(String(idx + 1), colX.num, y + 4);
    const name = item.name || "";
    const desc = item.description || "";
    const label = desc ? `${name}\n${desc}` : name;
    const labelLines = doc.splitTextToSize(label, colX.qty - colX.desc - 2);
    doc.text(labelLines, colX.desc, y + 4);
    doc.text(String(item.quantity || 1), colX.qty, y + 4);
    doc.text(String(item.days && item.days > 1 ? item.days : "—"), colX.days, y + 4);
    doc.text(formatCurrency(item.unit_rate || 0, false), colX.rate, y + 4);
    doc.text(formatCurrency(item.line_total || 0, false), colX.amount, y + 4, { align: "right" });

    // Bottom border
    doc.setDrawColor(235, 235, 240);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);

    y += Math.max(rowH, labelLines.length * 3.5 + 1);
  });

  y += 4;

  // --- Totals ---
  const totalsX = PAGE_W - MARGIN - 60;
  const totalsW = 60;
  const labelX = totalsX;
  const valueX = PAGE_W - MARGIN;

  const totalRows = [
    ["Subtotal", formatCurrency(quotation.subtotal || 0, false)],
  ];
  if (quotation.discount_amount > 0) {
    totalRows.push([
      `Discount${quotation.discount_type === "percentage" ? ` (${quotation.discount_value}%)` : ""}`,
      `−${formatCurrency(quotation.discount_amount || 0, false)}`,
    ]);
  }
  totalRows.push(["Taxable Amount", formatCurrency(quotation.taxable_amount || 0, false)]);
  if (gstApplicable) {
    if (quotation.gst_mode === "igst") {
      totalRows.push(["IGST", formatCurrency(quotation.igst_amount || 0, false)]);
    } else {
      totalRows.push(["CGST", formatCurrency(quotation.cgst_amount || 0, false)]);
      totalRows.push(["SGST", formatCurrency(quotation.sgst_amount || 0, false)]);
    }
  }

  totalRows.forEach(([label, val]) => {
    if (y + 5 > PAGE_H - MARGIN - 20) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(label, labelX, y + 4);
    doc.setTextColor(50, 50, 50);
    doc.text(val, valueX, y + 4, { align: "right" });
    y += 5;
  });

  // Grand total bar
  if (y + 8 > PAGE_H - MARGIN - 15) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFillColor(69, 58, 128);
  doc.rect(labelX - 2, y, totalsW + 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("GRAND TOTAL", labelX, y + 5.5);
  doc.text(formatCurrency(quotation.grand_total || 0), valueX, y + 5.5, { align: "right" });
  y += 12;

  // --- Terms & Conditions ---
  if (quotation.terms_and_conditions) {
    if (y + 20 > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Terms & Conditions", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const termsLines = doc.splitTextToSize(quotation.terms_and_conditions, CONTENT_W);
    termsLines.forEach((line) => {
      if (y + 4 > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += 4;
    });
  }

  // --- Notes ---
  if (quotation.notes) {
    y += 4;
    if (y + 10 > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Notes", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const notesLines = doc.splitTextToSize(quotation.notes, CONTENT_W);
    notesLines.forEach((line) => {
      if (y + 4 > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += 4;
    });
  }

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${bizName} · ${quotation.quotation_number}`,
      MARGIN,
      PAGE_H - 8
    );
    doc.text(
      `Page ${p} of ${pageCount}`,
      PAGE_W - MARGIN,
      PAGE_H - 8,
      { align: "right" }
    );
    // Footer line
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 11, PAGE_W - MARGIN, PAGE_H - 11);
  }

  // --- Save ---
  const fileName = `Kramashah_${quotation.quotation_number || "Quotation"}_${sanitizeFilename(clientName)}.pdf`;
  doc.save(fileName);
}