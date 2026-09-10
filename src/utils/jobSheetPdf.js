// Operational Job Sheet PDF generator using jsPDF.
// Builds a clean A4 portrait document for crew execution.
// NEVER includes financial data — only operational information.

import { jsPDF } from "jspdf";
import { formatDate } from "@/utils/format";
import { getDefaultEquipment } from "@/constants/equipment";

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

function sectionHeader(doc, y, title) {
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(245, 246, 250);
  doc.rect(MARGIN, y, CONTENT_W, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 50);
  doc.text(title, MARGIN + 3, y + 6);
  return y + 12;
}

function keyValue(doc, y, label, value) {
  if (!value) return y;
  y = ensureSpace(doc, y, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 50);
  const lines = doc.splitTextToSize(value, CONTENT_W - 30);
  doc.text(lines, MARGIN + 28, y);
  return y + 5 * lines.length + 2;
}

export async function generateJobSheetPDF({ data, config }) {
  const { event, client, category, itinerary, deliverables, crew_directory, map_url } = data;
  const equipmentItems =
    config.equipment_items?.length > 0
      ? config.equipment_items.filter(Boolean)
      : getDefaultEquipment(category);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // ─── Header ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 50);
  doc.text("JOB SHEET", MARGIN, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), PAGE_W - MARGIN, y + 6, { align: "right" });
  y += 12;

  doc.setDrawColor(220, 220, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // Event title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 50);
  doc.text(event.title || "—", MARGIN, y + 5);
  y += 8;

  // Event type / category
  const typeLine = [event.event_type, category ? category.replace(/_/g, " ").toLowerCase() : ""].filter(Boolean).join(" · ");
  if (typeLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(typeLine, MARGIN, y);
    y += 5;
  }

  // Dates
  const dateLine = event.start_date
    ? event.end_date && event.end_date !== event.start_date
      ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}`
      : formatDate(event.start_date)
    : "";
  if (dateLine) {
    y = keyValue(doc, y, "Dates", dateLine);
  }

  // Client
  if (client) {
    y = ensureSpace(doc, y, 10);
    const clientParts = [client.name, client.phone, client.email].filter(Boolean);
    y = keyValue(doc, y, "Client", clientParts.join("  ·  "));
  }

  // Venue
  if (event.venue || event.venue_address) {
    y = ensureSpace(doc, y, 10);
    const venueParts = [event.venue, event.venue_address].filter(Boolean);
    y = keyValue(doc, y, "Venue", venueParts.join(" — "));
  }

  y += 4;

  // ─── Date-wise Itinerary ───
  if (itinerary && itinerary.length > 0) {
    y = sectionHeader(doc, y, "DATE-WISE ITINERARY");

    for (const day of itinerary) {
      // Check space for the date block header + at least 3 lines
      y = ensureSpace(doc, y, 20);

      // Date + phase
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 50);
      const dateLabel = formatDate(day.date);
      let dateText = dateLabel;
      if (day.phase_title) dateText += `  —  ${day.phase_title}`;
      doc.text(dateText, MARGIN, y);
      y += 5;

      // Reporting time
      const override = config.date_overrides?.find((o) => o.date === day.date);
      const reportingTime = override?.reporting_time || config.default_reporting_time || "";
      const dayVenue = override?.venue || "";

      if (reportingTime) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(`Reporting: ${reportingTime}`, MARGIN + 3, y);
        y += 4;
      }
      if (dayVenue) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(`Venue: ${dayVenue}`, MARGIN + 3, y);
        y += 4;
      }

      // Crew
      if (day.crew && day.crew.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 100);
        doc.text("Crew:", MARGIN + 3, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 50);

        if (config.show_team_names) {
          const crewLines = day.crew.map((c) => {
            let line = c.role;
            if (c.member_name) line += ` — ${c.member_name}`;
            if (c.member_side) line += ` (${c.member_side})`;
            return line;
          });
          const crewText = crewLines.join("  ·  ");
          const lines = doc.splitTextToSize(crewText, CONTENT_W - 12);
          y = ensureSpace(doc, y, 4 * lines.length);
          doc.text(lines, MARGIN + 15, y);
          y += 4 * lines.length + 1;
        } else {
          // Group by role with counts
          const roleMap = new Map();
          for (const c of day.crew) {
            roleMap.set(c.role, (roleMap.get(c.role) || 0) + 1);
          }
          const crewText = Array.from(roleMap.entries()).map(([r, n]) => `${n}× ${r}`).join("  ·  ");
          const lines = doc.splitTextToSize(crewText, CONTENT_W - 12);
          y = ensureSpace(doc, y, 4 * lines.length);
          doc.text(lines, MARGIN + 15, y);
          y += 4 * lines.length + 1;
        }
      }

      // Deliverables for this date
      if (day.deliverables && day.deliverables.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 100);
        doc.text("Deliverables:", MARGIN + 3, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 50);
        const delText = day.deliverables.join("  ·  ");
        const lines = doc.splitTextToSize(delText, CONTENT_W - 12);
        y = ensureSpace(doc, y, 4 * lines.length);
        doc.text(lines, MARGIN + 22, y);
        y += 4 * lines.length + 1;
      }

      y += 3;
      doc.setDrawColor(235, 235, 245);
      doc.line(MARGIN + 3, y, PAGE_W - MARGIN - 3, y);
      y += 4;
    }
  }

  // ─── Deliverable Checklist ───
  if (deliverables && deliverables.length > 0) {
    y = sectionHeader(doc, y, "DELIVERABLE CHECKLIST");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);
    const colW = CONTENT_W / 2;
    let rowY = y;
    deliverables.forEach((d, idx) => {
      const col = idx % 2;
      if (col === 0) {
        rowY = ensureSpace(doc, rowY, 8);
      }
      const xPos = MARGIN + col * colW;
      doc.rect(xPos, rowY - 3, 3, 3);
      const lines = doc.splitTextToSize(d, colW - 8);
      doc.text(lines, xPos + 5, rowY);
      if (col === 1) rowY += 6;
    });
    if (deliverables.length % 2 === 1) rowY += 6;
    y = rowY + 4;
  }

  // ─── Internal Notes ───
  const internalNotes = config.internal_notes || event.notes || "";
  if (internalNotes) {
    y = sectionHeader(doc, y, "INTERNAL NOTES");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);
    const lines = doc.splitTextToSize(internalNotes, CONTENT_W);
    for (const line of lines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 3;
  }

  // ─── Crew Contact Directory ───
  if (config.include_contacts && crew_directory && crew_directory.length > 0) {
    y = sectionHeader(doc, y, "CREW CONTACT DIRECTORY");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const c of crew_directory) {
      y = ensureSpace(doc, y, 6);
      doc.setTextColor(30, 30, 50);
      doc.text(`${c.name} (${c.role})`, MARGIN, y);
      if (c.phone) {
        doc.setTextColor(100, 100, 120);
        doc.text(c.phone, PAGE_W - MARGIN, y, { align: "right" });
      }
      y += 6;
    }
    y += 3;
  }

  // ─── Equipment Checklist ───
  if (config.include_equipment && equipmentItems.length > 0) {
    y = sectionHeader(doc, y, "EQUIPMENT / KIT CHECKLIST");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);
    const colW = CONTENT_W / 2;
    let rowY = y;
    equipmentItems.forEach((item, idx) => {
      const col = idx % 2;
      if (col === 0) {
        rowY = ensureSpace(doc, rowY, 8);
      }
      const xPos = MARGIN + col * colW;
      doc.rect(xPos, rowY - 3, 3, 3);
      doc.text(item, xPos + 5, rowY);
      if (col === 1) rowY += 6;
    });
    if (equipmentItems.length % 2 === 1) rowY += 6;
    y = rowY + 4;
  }

  // ─── Footer on every page ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 170);
    doc.text("Generated by Kramashah — Operational Job Sheet", MARGIN, PAGE_H - 8);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const fileName = `JobSheet_${(event.title || "Event").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}