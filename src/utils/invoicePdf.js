// Professional Invoice PDF generator using jsPDF.
// Builds a clean A4 portrait document matching the Kramashah quotation style.
import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/utils/format";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(doc, y, needed) {
  if (y + needed > PAGE_H - MARGIN - 15) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

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
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateInvoicePDF({ invoice, workspace, payments = [] }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const biz = invoice.business_snapshot || {};
  const cli = invoice.client_snapshot || {};
  const evt = invoice.event_snapshot || {};
  const bank = invoice.bank_snapshot || {};
  const isGST = invoice.tax_enabled;
  const showRates = invoice.show_itemized_rates !== false;

  // ─── Header ───
  const logoData = await loadImageDataUrl(biz.logo || workspace?.logo);
  if (logoData) {
    try { doc.addImage(logoData, "PNG", MARGIN, y, 18, 18); } catch {}
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 50);
  doc.text(biz.name || workspace?.name || "", MARGIN + (logoData ? 22 : 0), y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  if (biz.address) { const a1 = doc.splitTextToSize(biz.address, 80); doc.text(a1, MARGIN + (logoData ? 22 : 0), y + 11); }
  if (biz.phone) doc.text(`Ph: ${biz.phone}`, MARGIN + (logoData ? 22 : 0), y + 15);
  if (biz.email) doc.text(biz.email, MARGIN + (logoData ? 22 : 0), y + 19);

  // Right side: TAX INVOICE / INVOICE + number + dates
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 50);
  doc.text(isGST ? "TAX INVOICE" : "INVOICE", PAGE_W - MARGIN, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text(invoice.invoice_number, PAGE_W - MARGIN, y + 12, { align: "right" });
  doc.text(`Issue Date: ${formatDate(invoice.issue_date)}`, PAGE_W - MARGIN, y + 16, { align: "right" });
  if (invoice.due_date) doc.text(`Due Date: ${formatDate(invoice.due_date)}`, PAGE_W - MARGIN, y + 20, { align: "right" });

  y += 26;
  doc.setDrawColor(220, 220, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ─── Billed To + Project Details ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text("BILLED TO", MARGIN, y);
  if (evt.title) doc.text("PROJECT / EVENT", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 50);
  doc.text(cli.name || "—", MARGIN, y);
  if (evt.title) doc.text(evt.title, PAGE_W - MARGIN, y, { align: "right" });
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  const clientLines = [
    cli.address,
    cli.phone && `Ph: ${cli.phone}`,
    cli.email,
    cli.gstin && `GSTIN: ${cli.gstin}`,
  ].filter(Boolean);
  clientLines.forEach((line) => {
    y = ensureSpace(doc, y, 4);
    const wrapped = doc.splitTextToSize(line, 80);
    doc.text(wrapped, MARGIN, y);
    y += 4 * wrapped.length;
  });

  const eventLines = [
    evt.venue && `Venue: ${evt.venue}`,
    evt.start_date && `Dates: ${formatDate(evt.start_date)}${evt.end_date && evt.end_date !== evt.start_date ? " — " + formatDate(evt.end_date) : ""}`,
    evt.event_type && `Type: ${evt.event_type}`,
  ].filter(Boolean);
  let eventY = y - 4 * clientLines.length;
  eventLines.forEach((line) => {
    eventY = ensureSpace(doc, eventY, 4);
    const wrapped = doc.splitTextToSize(line, 80);
    doc.text(wrapped, PAGE_W - MARGIN, eventY, { align: "right" });
    eventY += 4 * wrapped.length;
  });
  y = Math.max(y, eventY) + 4;

  // ─── Line Items ───
  y = ensureSpace(doc, y, 20);
  doc.setFillColor(245, 246, 250);
  doc.rect(MARGIN, y, CONTENT_W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 50);

  if (showRates) {
    doc.text("#", MARGIN + 3, y + 5.5);
    doc.text("Description", MARGIN + 12, y + 5.5);
    doc.text("Qty", MARGIN + 120, y + 5.5, { align: "right" });
    doc.text("Rate", MARGIN + 150, y + 5.5, { align: "right" });
    doc.text("Amount", PAGE_W - MARGIN - 3, y + 5.5, { align: "right" });
  } else {
    doc.text("Description", MARGIN + 3, y + 5.5);
    doc.text("Amount", PAGE_W - MARGIN - 3, y + 5.5, { align: "right" });
  }
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 50);

  (invoice.line_items || []).forEach((item, idx) => {
    y = ensureSpace(doc, y, 8);
    if (showRates) {
      doc.text(String(idx + 1), MARGIN + 3, y + 4);
      const descLines = doc.splitTextToSize(item.description || "", 100);
      doc.text(descLines, MARGIN + 12, y + 4);
      if (item.deliverables) {
        const delLines = doc.splitTextToSize(item.deliverables, 100);
        doc.setTextColor(120, 120, 140);
        doc.text(delLines, MARGIN + 12, y + 4 + 4 * descLines.length);
        doc.setTextColor(30, 30, 50);
      }
      doc.text(String(item.quantity || 1), MARGIN + 120, y + 4, { align: "right" });
      doc.text(formatCurrency(item.unit_rate || 0), MARGIN + 150, y + 4, { align: "right" });
      doc.text(formatCurrency(item.line_total || 0), PAGE_W - MARGIN - 3, y + 4, { align: "right" });
      y += 5 + 4 * (descLines.length + (item.deliverables ? 1 : 0));
    } else {
      const descLines = doc.splitTextToSize(item.description || "", CONTENT_W - 40);
      doc.text(descLines, MARGIN + 3, y + 4);
      if (item.deliverables) {
        const delLines = doc.splitTextToSize(item.deliverables, CONTENT_W - 40);
        doc.setTextColor(120, 120, 140);
        doc.text(delLines, MARGIN + 3, y + 4 + 4 * descLines.length);
        doc.setTextColor(30, 30, 50);
      }
      y += 5 + 4 * (descLines.length + (item.deliverables ? 1 : 0));
    }
    doc.setDrawColor(240, 240, 245);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;
  });

  // ─── Summary ───
  y = ensureSpace(doc, y, 40);
  y += 4;
  const summaryX = PAGE_W - MARGIN - 80;
  const labelX = summaryX;
  const valueX = PAGE_W - MARGIN - 3;

  const summaryRow = (label, value, isBold = false) => {
    y = ensureSpace(doc, y, 5);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 10 : 9);
    doc.setTextColor(isBold ? 30 : 100, isBold ? 30 : 100, isBold ? 50 : 120);
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: "right" });
    y += 5;
  };

  summaryRow("Subtotal", formatCurrency(invoice.subtotal || 0));
  if ((invoice.discount_amount || 0) > 0) {
    summaryRow(`Discount${invoice.discount_type === "percentage" ? ` (${invoice.discount_value}%)` : ""}`, `−${formatCurrency(invoice.discount_amount)}`);
  }
  summaryRow("Taxable Amount", formatCurrency(invoice.taxable_amount || 0));
  if (isGST) {
    if (invoice.tax_mode === "IGST") {
      summaryRow(`IGST (${invoice.tax_rate}%)`, formatCurrency(invoice.igst_amount || 0));
    } else {
      summaryRow(`CGST (${(invoice.tax_rate || 0) / 2}%)`, formatCurrency(invoice.cgst_amount || 0));
      summaryRow(`SGST (${(invoice.tax_rate || 0) / 2}%)`, formatCurrency(invoice.sgst_amount || 0));
    }
  }
  y += 2;
  doc.setDrawColor(200, 200, 215);
  doc.line(labelX, y, valueX, y);
  y += 5;
  summaryRow("Total Invoice Amount", formatCurrency(invoice.total_amount || 0), true);

  if ((invoice.amount_paid || 0) > 0) {
    summaryRow("Less: Amount Already Paid", `−${formatCurrency(invoice.amount_paid)}`);
    summaryRow("Net Balance Payable", formatCurrency(invoice.balance_due || 0), true);
  }

  // Amount in words
  y = ensureSpace(doc, y, 8);
  y += 2;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 80);
  doc.text(`Amount in Words: ${invoice.amount_in_words || ""}`, MARGIN, y);
  y += 8;

  // ─── Bank Details + Footer ───
  y = ensureSpace(doc, y, 30);
  y += 4;
  doc.setDrawColor(220, 220, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // Bank details (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 120);
  doc.text("PAYMENT DETAILS", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 50);
  if (bank.bank_account_name) { doc.text(`A/C: ${bank.bank_account_name}`, MARGIN, y); y += 4; }
  if (bank.bank_name) { doc.text(`Bank: ${bank.bank_name}`, MARGIN, y); y += 4; }
  if (bank.bank_account_number) { doc.text(`A/C No: ${bank.bank_account_number}`, MARGIN, y); y += 4; }
  if (bank.bank_ifsc) { doc.text(`IFSC: ${bank.bank_ifsc}`, MARGIN, y); y += 4; }
  if (bank.bank_upi_id) { doc.text(`UPI: ${bank.bank_upi_id}`, MARGIN, y); y += 4; }

  // UPI QR code (right) — generate from UPI ID
  if (bank.bank_upi_id) {
    try {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(bank.bank_upi_id)}&pn=${encodeURIComponent(biz.name || "")}&am=${invoice.balance_due || invoice.total_amount || 0}&cu=INR`;
      // Use jsPDF's built-in QR code via API... actually jsPDF doesn't have built-in QR.
      // We'll just show the UPI ID text — QR generation requires a plugin.
    } catch {}
  }

  // Terms (if any)
  if (invoice.payment_terms) {
    y = ensureSpace(doc, y, 12);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    doc.text("PAYMENT TERMS", MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 50);
    const termLines = doc.splitTextToSize(invoice.payment_terms, CONTENT_W);
    termLines.forEach((line) => {
      y = ensureSpace(doc, y, 4);
      doc.text(line, MARGIN, y);
      y += 4;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 170);
    if (workspace?.social_website) doc.text(workspace.social_website, MARGIN, PAGE_H - 8);
    if (workspace?.social_instagram) doc.text(`Instagram: ${workspace.social_instagram}`, MARGIN + 80, PAGE_H - 8);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const fileName = `Invoice_${invoice.invoice_number || "Document"}.pdf`;
  doc.save(fileName);
}