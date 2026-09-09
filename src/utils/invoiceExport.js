import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/utils/format";
import { transactionTypeLabels } from "@/constants/finance";
import { sanitizeFilename } from "@/utils/exports";

// Builds a human-readable "particular" string for a transaction, using
// real related-entity data — never placeholder text.
export function buildParticular(transaction, { event, client, member, serviceAssignment, members }) {
  const sa = serviceAssignment;
  const saName = sa?.service_name_snapshot;
  const saProvider = sa?.provider_name_snapshot;

  if (transaction.transaction_type === "CLIENT_RECEIPT") {
    if (saName) {
      return `Payment for ${saName}${saProvider ? ` (${saProvider})` : ""}`;
    }
    return `Payment from ${client?.name || "Client"}`;
  }
  if (transaction.transaction_type === "TEAM_PAYMENT") {
    const m = member || members?.find((x) => x.id === transaction.team_member_id);
    const role = m?.profession || sa?.provider_name_snapshot;
    return `Payment to ${m?.name || "Team Member"}${role ? ` (${role})` : ""}`;
  }
  if (transaction.transaction_type === "BUSINESS_EXPENSE") {
    if (saName) {
      return `Payment for ${saName}${saProvider ? ` (${saProvider})` : ""}`;
    }
    return `Expense payment${member ? ` to ${member.name}` : ""}`;
  }
  return transactionTypeLabels[transaction.transaction_type] || "Transaction";
}

// Generates a clean, professional PDF receipt for a single transaction.
// White background, proper margins, readable text — no browser chrome, no
// screenshots, no black canvas.
export function exportInvoicePDF({
  transaction,
  workspace,
  event,
  client,
  particular,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  let y = 20;

  // --- Header: Business branding ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(workspace?.name || "Business", margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  const bizAddr = [workspace?.address, workspace?.city, workspace?.state]
    .filter(Boolean)
    .join(", ");
  if (bizAddr) {
    doc.text(bizAddr, margin, y);
    y += 4;
  }
  if (workspace?.phone) {
    doc.text(`Phone: ${workspace.phone}`, margin, y);
    y += 4;
  }
  if (workspace?.email) {
    doc.text(`Email: ${workspace.email}`, margin, y);
    y += 4;
  }
  if (workspace?.gstin) {
    doc.text(`GSTIN: ${workspace.gstin}`, margin, y);
    y += 4;
  }

  // --- Right side: Receipt title + date ---
  y = 20;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("PAYMENT RECEIPT", pageW - margin, y, { align: "right" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text(formatDate(transaction.transaction_date), pageW - margin, y, {
    align: "right",
  });

  // --- Divider ---
  y = Math.max(y + 4, 50);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // --- Billed To / Event context ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("BILLED TO", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  if (client) {
    doc.text(client.name || "—", margin, y);
    y += 4;
    if (client.phone) {
      doc.text(`Phone: ${client.phone}`, margin, y);
      y += 4;
    }
    if (client.email) {
      doc.text(`Email: ${client.email}`, margin, y);
      y += 4;
    }
  } else {
    doc.text("—", margin, y);
    y += 4;
  }

  // --- Event context ---
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`${event ? "EVENT" : ""}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  if (event) {
    doc.text(event.title || "—", margin, y);
    y += 4;
    if (event.start_date) {
      doc.text(
        `Date: ${formatDate(event.start_date)}${event.end_date ? ` → ${formatDate(event.end_date)}` : ""}`,
        margin,
        y
      );
      y += 4;
    }
    if (event.venue) {
      doc.text(`Venue: ${event.venue}`, margin, y);
      y += 4;
    }
  }

  // --- Transaction details ---
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const labelX = margin;
  const valueX = pageW - margin;
  const rowH = 7;

  const detailRow = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(label, labelX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(value, valueX, y, { align: "right" });
    y += rowH;
  };

  detailRow("Particular", particular || "—");
  detailRow("Type", transactionTypeLabels[transaction.transaction_type] || "—");
  detailRow("Payment Method", transaction.payment_method || "—");
  if (transaction.reference_number) {
    detailRow("Reference", transaction.reference_number);
  }

  // --- Amount box ---
  y += 4;
  doc.setFillColor(245, 245, 248);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "FD");
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text("AMOUNT", margin + 4, y + 9);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(formatCurrency(transaction.amount), valueX - 4, y + 10, {
    align: "right",
  });
  y += 20;

  // --- Notes ---
  if (transaction.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Notes", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const notesLines = doc.splitTextToSize(transaction.notes, pageW - margin * 2);
    doc.text(notesLines, margin, y);
  }

  // --- Footer ---
  const footerY = 285;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${workspace?.name || "Business"} · Generated on ${formatDate(new Date().toISOString())}`,
    pageW / 2,
    footerY + 5,
    { align: "center" }
  );

  // --- Save ---
  const eventName = sanitizeFilename(event?.title || "");
  const filename = `Receipt_${eventName}_${transaction.transaction_date || "date"}.pdf`;
  doc.save(filename);
}

// Shares the invoice via the native Web Share API. Returns:
// "shared" — native share succeeded
// "copied" — fell back to clipboard
// false — neither available
export async function shareInvoice({ transaction, workspace, event, particular }) {
  const lines = [
    workspace?.name || "Business",
    "PAYMENT RECEIPT",
    "",
    `Date: ${formatDate(transaction.transaction_date)}`,
    `Type: ${transactionTypeLabels[transaction.transaction_type] || "—"}`,
    `Amount: ${formatCurrency(transaction.amount)}`,
    `Method: ${transaction.payment_method || "—"}`,
  ];
  if (event) lines.push(`Event: ${event.title}`);
  if (particular) lines.push(`Particular: ${particular}`);
  if (transaction.reference_number) lines.push(`Reference: ${transaction.reference_number}`);
  const text = lines.join("\n");

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `Payment Receipt — ${workspace?.name || "Business"}`,
        text,
      });
      return "shared";
    } catch (e) {
      // AbortError = user cancelled; don't fall back to clipboard in that case
      if (e?.name === "AbortError") return false;
    }
  }
  // Fallback: copy to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return false;
    }
  }
  return false;
}