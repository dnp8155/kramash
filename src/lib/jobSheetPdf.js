import { jsPDF } from "jspdf";
import { formatEventDate } from "@/lib/dates";
import { CATEGORY_LABELS } from "@/lib/jobSheetService";

const PRIMARY = [31, 56, 92];
const MUTED = [110, 120, 135];
const LIGHT = [245, 247, 250];
const BORDER = [210, 218, 228];
const WHITE = [255, 255, 255];

function fmtDay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}

function sanitizeFilename(s) {
  return String(s || "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-");
}

export async function generateJobSheetPdf({ data, config, workspace, returnBlob = false }) {
  const { event, client, quotationItems, teamAssignments, dayAssignments, membersById, eventDates } = data;
  const dateConfigs = config.date_configs || {};
  const equipment = config.equipment_list || [];
  const deliverables = config.deliverables || [];
  const showTeamNames = config.show_team_names;
  const includeContacts = config.include_crew_contacts;
  const includeEquipment = config.include_equipment;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper: check page break
  const checkBreak = (needed = 10) => {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: section header
  const addSectionHeader = (title) => {
    checkBreak(15);
    doc.setFillColor(...PRIMARY);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 2, y + 5);
    y += 11;
  };

  // Helper: label + value row
  const addInfoRow = (label, value, x, width) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(label + ":", x, y);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(value || "—", width - 18);
    doc.text(lines, x + 16, y);
    y += Math.max(5, lines.length * 4.5);
  };

  // ---- Header ----
  doc.setFillColor(...PRIMARY);
  doc.rect(margin, y, contentWidth, 12, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("OPERATIONAL JOB SHEET", margin + 3, y + 8);
  y += 18;

  // Event title
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(event?.title || "Job Sheet", contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Category + Read Only
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const catLabel = CATEGORY_LABELS[workspace?.business_category] || workspace?.custom_business_type || "Other";
  doc.text(`${catLabel}  ·  Read Only  ·  No Financial Information`, margin, y);
  y += 6;

  // Separator
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ---- Event Info ----
  const colWidth = contentWidth / 2;
  const startY = y;
  addInfoRow("Client", client?.name, margin, colWidth);
  addInfoRow("Contact", client?.phone, margin + colWidth, colWidth);
  addInfoRow("Venue", event?.venue, margin, colWidth);
  addInfoRow("Type", event?.event_type, margin + colWidth, colWidth);
  addInfoRow("Dates", event?.start_date ? formatEventDate(event.start_date, event.end_date) : "", margin, colWidth);
  addInfoRow("Address", event?.venue_address || [client?.address, client?.city].filter(Boolean).join(", "), margin + colWidth, colWidth);
  y += 3;

  // ---- Itinerary ----
  const itinerary = eventDates.map(date => {
    const dayItems = quotationItems.filter(item => item.day_date === date);
    const phases = [...new Set(dayItems.map(item => item.phase_title).filter(Boolean))];
    const dc = dateConfigs[date] || {};
    const dayAssignment = dayAssignments.find(d => d.date === date);
    const assignedMembers = teamAssignments.filter(a => a.working_dates?.includes(date));
    const crewItems = dayItems.filter(item => item.item_type === "role" || item.item_type === "team");

    let crewDisplay = [];
    if (showTeamNames) {
      crewDisplay = assignedMembers.map(a => `${a.role_name_snapshot || "Crew"} — ${membersById[a.team_member_id]?.name || "—"}`);
    } else {
      const grouped = {};
      crewItems.forEach(item => {
        if (!grouped[item.name]) grouped[item.name] = 0;
        grouped[item.name] += (item.quantity || 1);
      });
      if (Object.keys(grouped).length > 0) {
        crewDisplay = Object.entries(grouped).map(([name, qty]) => `${qty > 1 ? qty + "× " : ""}${name}`);
      } else {
        const roleGrouped = {};
        assignedMembers.forEach(a => {
          const role = a.role_name_snapshot || "Crew";
          roleGrouped[role] = (roleGrouped[role] || 0) + 1;
        });
        crewDisplay = Object.entries(roleGrouped).map(([role, count]) => `${count > 1 ? count + "× " : ""}${role}`);
      }
    }

    return {
      date,
      phase: dc.phase_title || phases[0] || "",
      reportingTime: dc.reporting_time || "",
      venue: dc.venue_override || dayAssignment?.venue_override || event?.venue || "",
      crewDisplay
    };
  });

  if (itinerary.length > 0) {
    addSectionHeader("Date-wise Itinerary");
    itinerary.forEach((day, i) => {
      checkBreak(25);
      // Card background
      doc.setFillColor(...LIGHT);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      const cardHeight = 8 + (day.phase ? 5 : 0) + (day.reportingTime ? 5 : 0) + (day.venue ? 5 : 0) + (day.crewDisplay.length > 0 ? 5 + day.crewDisplay.length * 4.5 : 0);
      doc.rect(margin, y - 2, contentWidth, cardHeight, "S");
      doc.setFillColor(...LIGHT);
      doc.rect(margin, y - 2, contentWidth, 6, "F");

      // Date + phase header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PRIMARY);
      doc.text(fmtDay(day.date), margin + 2, y + 2);
      if (day.phase) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text("· " + day.phase, margin + 18, y + 2);
      }
      y += 7;

      // Details
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      if (day.reportingTime) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text("Reporting:", margin + 2, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(day.reportingTime, margin + 22, y);
        y += 5;
      }
      if (day.venue) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text("Venue:", margin + 2, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(day.venue, margin + 18, y);
        y += 5;
      }
      if (day.crewDisplay.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text("Crew:", margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        day.crewDisplay.forEach((c, ci) => {
          if (ci > 0) y += 4.5;
          checkBreak(8);
          doc.text(c, margin + 18, y);
        });
        y += 6;
      }
      y += 5;
    });
  }

  // ---- Deliverables ----
  if (deliverables.length > 0) {
    addSectionHeader("Deliverables Checklist");
    deliverables.forEach(item => {
      checkBreak(6);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(margin + 1, y - 3, 4, 4);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(item, margin + 8, y);
      y += 5.5;
    });
    y += 3;
  }

  // ---- Internal Notes ----
  if (config.internal_notes) {
    addSectionHeader("Internal Notes");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const noteLines = doc.splitTextToSize(config.internal_notes, contentWidth - 4);
    noteLines.forEach(line => {
      checkBreak(5);
      doc.text(line, margin + 2, y);
      y += 4.5;
    });
    y += 3;
  }

  // ---- Crew Contact Directory ----
  if (includeContacts && teamAssignments.length > 0) {
    addSectionHeader("Crew Contact Directory");
    // Table header
    doc.setFillColor(...LIGHT);
    doc.rect(margin, y - 3, contentWidth, 5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text("NAME", margin + 2, y);
    doc.text("ROLE", margin + 60, y);
    doc.text("PHONE", margin + 130, y);
    y += 6;

    teamAssignments.forEach(a => {
      checkBreak(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      const name = membersById[a.team_member_id]?.name || "—";
      const role = a.role_name_snapshot || "Crew";
      const phone = membersById[a.team_member_id]?.phone || "—";
      doc.text(name, margin + 2, y);
      doc.text(role, margin + 60, y);
      doc.text(phone, margin + 130, y);
      y += 5.5;
    });
    y += 3;
  }

  // ---- Equipment ----
  if (includeEquipment && equipment.length > 0) {
    addSectionHeader("Equipment / Kit Checklist");
    equipment.forEach(item => {
      checkBreak(6);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.rect(margin + 1, y - 3, 4, 4);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(item, margin + 8, y);
      y += 5.5;
    });
    y += 3;
  }

  // ---- Footer on each page ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("This document contains no financial information.", margin, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 8);
  }

  const filename = `Job-Sheet-${sanitizeFilename(event?.title)}.pdf`;

  if (returnBlob) {
    return doc.output("blob");
  }
  doc.save(filename);
}