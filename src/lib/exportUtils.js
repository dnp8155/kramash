// Excel/CSV export utility for Kramasha.
// Generates real .xlsx files (via SheetJS) and CSV files (with BOM for Excel).
// Only exports the authenticated workspace's data — callers are responsible
// for passing pre-filtered, workspace-scoped rows.

import * as XLSX from "xlsx";
import { eventFinancialSummary, assignmentPaid, serviceAssignmentPaid, teamPaymentStatus } from "@/lib/financeService";
import { fyForDate } from "@/lib/dates";

// Sanitize a filename component.
function sanitizeFilename(s) {
  return String(s || "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_");
}

// Escape a CSV cell value.
function escapeCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---- CSV helpers (kept for backward compat) ----

export function rowsToCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- XLSX helpers (real .xlsx via SheetJS) ----

// Build an XLSX workbook from row objects + column definitions.
// columns: [{ key, label }] — key is the property in each row, label is the header.
function rowsToWorkbook(rows, columns, sheetName) {
  const data = (rows || []).map((row) => {
    const obj = {};
    columns.forEach((c) => {
      obj[c.label] = row[c.key];
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.label),
  });
  // Auto-size columns based on header + content length.
  ws["!cols"] = columns.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...data.map((r) => String(r[c.label] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
  return wb;
}

// Download an XLSX workbook as a file.
function downloadXlsx(wb, filename) {
  XLSX.writeFile(wb, filename, { bookType: "xlsx", type: "binary" });
}

// ---- Multi-sheet export helpers ----
// The app uses the free "xlsx" (SheetJS Community) package, which cannot write
// real cell styling (bold, borders, fills) into .xlsx output — only structural
// features (merged cells, column widths) actually render. Readability relies on
// merged section titles and generous column widths rather than visual styling.

function titleCase(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/(^|[\s\-_/])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

const INVALID_SHEET_CHARS = /[[\]*/\\?:]/g;

// Sanitize + de-duplicate an Excel sheet name (31 char limit, no [ ] * / \ ? :).
function uniqueSheetName(name, usedNames) {
  const base = (String(name || "Sheet").replace(INVALID_SHEET_CHARS, "").trim() || "Sheet").slice(0, 31);
  let candidate = base;
  let n = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    n += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function mergeRange(ws, r1, c1, r2, c2) {
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

function autoColWidths(rows, colCount, { min = 10, max = 42 } = {}) {
  const widths = new Array(colCount).fill(min);
  rows.forEach((row) => {
    (row || []).forEach((cell, i) => {
      if (i >= colCount) return;
      const len = String(cell ?? "").length + 2;
      if (len > widths[i]) widths[i] = Math.min(len, max);
    });
  });
  return widths.map((wch) => ({ wch }));
}

// Deliver a workbook: native share sheet first (mobile/desktop), then a
// temporary download link, then XLSX.writeFile as a last-resort fallback.
async function shareOrDownload(wb, filename) {
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  try {
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const file = new File([wbout], filename, { type: mime });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
  }
  try {
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    XLSX.writeFile(wb, filename, { bookType: "xlsx", type: "binary" });
  }
}

// ---- Export: Events ----

function fyStartYear(event) {
  const fy = event.financial_year || fyForDate(event.start_date) || "";
  const y = parseInt(String(fy).replace(/^FY\s*/i, "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : 0;
}

function sortEventsForExport(events) {
  return [...(events || [])].sort((a, b) => {
    const fyDiff = fyStartYear(b) - fyStartYear(a);
    if (fyDiff !== 0) return fyDiff;
    const dateDiff = String(a.start_date || "").localeCompare(String(b.start_date || ""));
    if (dateDiff !== 0) return dateDiff;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

const TX_TYPE_LABELS = {
  CLIENT_RECEIPT: "Client Receipt",
  TEAM_PAYMENT: "Team Payment",
  BUSINESS_EXPENSE: "Business Expense",
};

function buildEventDetailRows(event, ctx) {
  const { clientsMap, teamMap, serviceMap, assignmentsByEvent, serviceAssignmentsByEvent, transactions, locationLabel, statusLabel } = ctx;
  const client = clientsMap[event.client_id] || {};
  const evTx = (transactions || [])
    .filter((tx) => tx.event_id === event.id)
    .sort((a, b) => String(a.transaction_date || "").localeCompare(String(b.transaction_date || "")));
  const assignments = (assignmentsByEvent[event.id] || []).filter((a) => a.assignment_status !== "removed");
  const services = (serviceAssignmentsByEvent[event.id] || []).filter((a) => a.assignment_status !== "removed");

  const rows = [];
  rows.push([event.title || ""]);
  rows.push([]);

  rows.push(["Client Details"]);
  rows.push(["Client Name", client.name || ""]);
  rows.push(["Phone", client.phone || ""]);
  rows.push(["Email", client.email || ""]);
  rows.push([locationLabel, event.venue || ""]);
  rows.push(["Event Type", event.event_type || ""]);
  rows.push(["Start Date", event.start_date || ""]);
  rows.push(["End Date", event.end_date || ""]);
  rows.push(["Status", statusLabel(event.status)]);
  rows.push([]);

  rows.push(["Transactions"]);
  rows.push(["Date", "Type", "Party", "Amount", "Method", "Reference", "Status", "Notes"]);
  if (evTx.length === 0) {
    rows.push(["No transactions recorded."]);
  } else {
    evTx.forEach((tx) => {
      let party = "";
      if (tx.transaction_type === "CLIENT_RECEIPT") party = client.name || "";
      else if (tx.transaction_type === "TEAM_PAYMENT") party = teamMap[tx.team_member_id]?.name || "";
      else party = tx.expense_category_name_snapshot || "";
      rows.push([
        tx.transaction_date || "",
        TX_TYPE_LABELS[tx.transaction_type] || tx.transaction_type,
        party,
        Number(tx.amount) || 0,
        tx.payment_method || "",
        tx.reference_number || "",
        tx.status || "",
        tx.notes || "",
      ]);
    });
  }
  rows.push([]);

  rows.push(["Team Members"]);
  rows.push(["Name", "Role", "Rate Type", "Agreed Rate", "Paid", "Status"]);
  if (assignments.length === 0) {
    rows.push(["No team members assigned."]);
  } else {
    assignments.forEach((a) => {
      const member = teamMap[a.team_member_id] || {};
      const isSelf = !!member.is_self;
      const paid = assignmentPaid(transactions, a.id);
      rows.push([
        isSelf ? `${member.name || "Self"} (Self)` : member.name || "",
        a.role_name_snapshot || member.profession || "",
        a.rate_type || "",
        Number(a.agreed_rate) || 0,
        isSelf ? "—" : paid,
        isSelf ? "Self (no payment due)" : teamPaymentStatus(paid, Number(a.agreed_rate) || 0),
      ]);
    });
  }
  rows.push([]);

  rows.push(["Services"]);
  rows.push(["Service", "Provider", "Rate Type", "Agreed Rate", "Add-on", "Paid", "Status"]);
  if (services.length === 0) {
    rows.push(["No services assigned."]);
  } else {
    services.forEach((a) => {
      const paid = serviceAssignmentPaid(transactions, a.id);
      rows.push([
        a.service_name_snapshot || serviceMap[a.service_id]?.name || "",
        a.provider_name_snapshot || "",
        a.rate_type || "",
        Number(a.agreed_rate) || 0,
        a.is_addon ? "Yes" : "No",
        paid,
        teamPaymentStatus(paid, Number(a.agreed_rate) || 0),
      ]);
    });
  }

  const notes = [event.notes, event.description].filter(Boolean).join("\n\n");
  if (notes) {
    rows.push([]);
    rows.push(["Notes"]);
    rows.push([notes]);
  }

  return rows;
}

// Builds a multi-sheet workbook: a "Main Summary" sheet with core financials
// for every event, plus one detail sheet per event (client, transactions,
// team, services, notes). Delivered via shareOrDownload (share sheet ->
// download link -> writeFile).
export async function exportEventsXlsx(events, clientsMap, fyLabel, term, opts = {}) {
  const t = term || {};
  const workSingular = t.workItemSingular || "Event";
  const workPlural = t.workItemPlural || "Events";
  const locationLabel = t.locationLabel || "Venue";
  const statusLabel = (s) => (t.statusLabels && t.statusLabels[s]) || titleCase(s);
  const {
    teamMap = {},
    serviceMap = {},
    assignmentsByEvent = {},
    serviceAssignmentsByEvent = {},
    transactions = [],
  } = opts;

  const sorted = sortEventsForExport(events);
  const wb = XLSX.utils.book_new();
  const usedNames = new Set(["main summary"]);

  const fyHeading = fyLabel ? `FY ${fyLabel}` : "All Years";
  const summaryHeader = ["#", `${workSingular} Name`, "Client", "Status", "Contract Value", "Received", "Paid", "Left Balance", "Profit"];
  const summaryRows = [[`Kramasha — ${workPlural} Summary — ${fyHeading}`], [], summaryHeader];
  const totals = { contract: 0, received: 0, paid: 0, left: 0, profit: 0 };
  sorted.forEach((e, i) => {
    const summary = eventFinancialSummary(e, transactions, assignmentsByEvent[e.id], serviceAssignmentsByEvent[e.id]);
    const paid = summary.teamPaid + summary.expenses;
    totals.contract += summary.contractValue;
    totals.received += summary.received;
    totals.paid += paid;
    totals.left += summary.pending;
    totals.profit += summary.profit;
    summaryRows.push([
      i + 1,
      e.title || "",
      clientsMap[e.client_id]?.name || "",
      statusLabel(e.status),
      summary.contractValue,
      summary.received,
      paid,
      summary.pending,
      summary.profit,
    ]);
  });
  summaryRows.push(["", "Totals", "", "", totals.contract, totals.received, totals.paid, totals.left, totals.profit]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  mergeRange(summaryWs, 0, 0, 0, summaryHeader.length - 1);
  summaryWs["!cols"] = autoColWidths(summaryRows, summaryHeader.length);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Main Summary");

  sorted.forEach((e) => {
    const sheetName = uniqueSheetName(e.title || workSingular, usedNames);
    const rows = buildEventDetailRows(e, {
      clientsMap, teamMap, serviceMap, assignmentsByEvent, serviceAssignmentsByEvent, transactions, locationLabel, statusLabel,
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    mergeRange(ws, 0, 0, 0, 7);
    ws["!cols"] = autoColWidths(rows, 8);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fy = fyLabel ? sanitizeFilename(fyLabel) : "All";
  const prefix = sanitizeFilename(t.exportPrefix || workPlural);
  await shareOrDownload(wb, `Kramasha_${prefix}_${fy}.xlsx`);
}

// Flattens every transaction (across all events) into one "Payment Activity"
// sheet. `display` mirrors exportFinancialXlsx's shape so callers can share
// the same lookups. Delivered via shareOrDownload.
export async function exportTransactionsXlsx(transactions, display, fyLabel) {
  const { eventsById = {}, clientsById = {}, membersById = {} } = display || {};
  const header = ["Date", "Event", "Type", "Party", "Amount", "Method", "Reference", "Status", "Notes"];
  const sorted = [...(transactions || [])].sort((a, b) => String(b.transaction_date || "").localeCompare(String(a.transaction_date || "")));
  const rows = [["Kramasha — Payment Activity"], [], header];
  sorted.forEach((tx) => {
    let party = "";
    if (tx.transaction_type === "CLIENT_RECEIPT") party = clientsById[tx.client_id]?.name || "";
    else if (tx.transaction_type === "TEAM_PAYMENT") party = membersById[tx.team_member_id]?.name || "";
    else party = tx.expense_category_name_snapshot || "";
    rows.push([
      tx.transaction_date || "",
      eventsById[tx.event_id]?.title || "",
      TX_TYPE_LABELS[tx.transaction_type] || tx.transaction_type,
      party,
      Number(tx.amount) || 0,
      tx.payment_method || "",
      tx.reference_number || "",
      tx.status || "",
      tx.notes || "",
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  mergeRange(ws, 0, 0, 0, header.length - 1);
  ws["!cols"] = autoColWidths(rows, header.length);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payment Activity");
  const fy = fyLabel ? sanitizeFilename(fyLabel) : "All";
  await shareOrDownload(wb, `Kramasha_Payment_Activity_${fy}.xlsx`);
}

// Backward-compat CSV alias.
export function exportEventsCsv(events, clientsMap, fyLabel, term) {
  const t = term || {};
  const workSingular = t.workItemSingular || "Event";
  const workPlural = t.workItemPlural || "Events";
  const locationLabel = t.locationLabel || "Venue";
  const columns = [
    { key: "title", label: `${workSingular} Name` },
    { key: "client_name", label: "Client" },
    { key: "start_date", label: "Start Date" },
    { key: "end_date", label: "End Date" },
    { key: "venue", label: locationLabel },
    { key: "status", label: "Status" },
    { key: "contract_value", label: "Contract Value" },
  ];
  const rows = events.map((e) => ({
    ...e,
    client_name: clientsMap[e.client_id]?.name || "",
    end_date: e.end_date || "",
    venue: e.venue || "",
  }));
  const csv = rowsToCsv(rows, columns);
  const fy = fyLabel ? sanitizeFilename(fyLabel) : "All";
  const prefix = sanitizeFilename(t.exportPrefix || workPlural);
  downloadCsv(csv, `Kramasha_${prefix}_${fy}.csv`);
}

// ---- Export: Clients ----

export function exportClientsXlsx(clients, eventCounts, term) {
  const t = term || {};
  const workPlural = t.workItemPlural || "Work Items";
  const columns = [
    { key: "name", label: "Client Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "event_count", label: workPlural },
  ];
  const rows = clients.map((c) => ({
    name: c.name || "",
    phone: c.phone || "",
    email: c.email || "",
    city: c.city || "",
    state: c.state || "",
    event_count: eventCounts[c.id] || 0,
  }));
  const wb = rowsToWorkbook(rows, columns, "Clients");
  downloadXlsx(wb, `Kramasha_Clients.xlsx`);
}

export function exportClientsCsv(clients, eventCounts) {
  const columns = [
    { key: "name", label: "Client Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "event_count", label: "Work Items" },
  ];
  const rows = clients.map((c) => ({
    name: c.name || "",
    phone: c.phone || "",
    email: c.email || "",
    city: c.city || "",
    state: c.state || "",
    event_count: eventCounts[c.id] || 0,
  }));
  const csv = rowsToCsv(rows, columns);
  downloadCsv(csv, `Kramasha_Clients.csv`);
}

// ---- Export: Team ----

export function exportTeamXlsx(members, rolesMap) {
  const columns = [
    { key: "name", label: "Team Member" },
    { key: "role", label: "Role" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "default_rate", label: "Default Rate" },
    { key: "rate_type", label: "Rate Type" },
    { key: "status", label: "Status" },
  ];
  const rows = members.map((m) => {
    const role = rolesMap[m.role_id] || {};
    const memberRate = Number(m.default_rate) || 0;
    const memberRateType = m.rate_type || "";
    // Role-rate fallback: when member's legacy default_rate is 0/empty,
    // use the rate from the member's assigned role.
    const rate = memberRate || Number(role.default_rate) || 0;
    const rateType = memberRateType || role.rate_type || "";
    return {
      name: m.name || "",
      role: role.name || m.profession || "",
      phone: m.phone || "",
      email: m.email || "",
      default_rate: rate,
      rate_type: rateType,
      status: m.status || "",
    };
  });
  const wb = rowsToWorkbook(rows, columns, "Team");
  downloadXlsx(wb, `Kramasha_Team.xlsx`);
}

export function exportTeamCsv(members, rolesMap) {
  const columns = [
    { key: "name", label: "Team Member" },
    { key: "role", label: "Role" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "default_rate", label: "Default Rate" },
    { key: "rate_type", label: "Rate Type" },
    { key: "status", label: "Status" },
  ];
  const rows = members.map((m) => ({
    name: m.name || "",
    role: rolesMap[m.role_id]?.name || m.profession || "",
    phone: m.phone || "",
    email: m.email || "",
    default_rate: m.default_rate || 0,
    rate_type: m.rate_type || "",
    status: m.status || "",
  }));
  const csv = rowsToCsv(rows, columns);
  downloadCsv(csv, `Kramasha_Team.csv`);
}

// ---- Export: Financial Transactions ----

export function exportFinancialXlsx(transactions, display, currency, fyLabel) {
  const { eventsById, clientsById, membersById } = display;
  const typeLabels = {
    CLIENT_RECEIPT: "Client Receipt",
    TEAM_PAYMENT: "Team Payment",
    BUSINESS_EXPENSE: "Business Expense",
  };
  const columns = [
    { key: "transaction_date", label: "Date" },
    { key: "event_title", label: "Work Item" },
    { key: "type_label", label: "Type" },
    { key: "party", label: "Client/Team/Expense" },
    { key: "amount", label: "Amount" },
    { key: "payment_method", label: "Method" },
    { key: "reference_number", label: "Reference" },
    { key: "notes", label: "Notes" },
    { key: "status", label: "Status" },
  ];
  const rows = transactions.map((t) => {
    const ev = eventsById[t.event_id];
    let party = "";
    if (t.transaction_type === "CLIENT_RECEIPT") {
      party = clientsById[t.client_id]?.name || "";
    } else if (t.transaction_type === "TEAM_PAYMENT") {
      party = membersById[t.team_member_id]?.name || "";
    } else {
      party = t.expense_category_name_snapshot || "";
    }
    return {
      transaction_date: t.transaction_date || "",
      event_title: ev?.title || "",
      type_label: typeLabels[t.transaction_type] || t.transaction_type,
      party,
      amount: Number(t.amount) || 0,
      payment_method: t.payment_method || "",
      reference_number: t.reference_number || "",
      notes: t.notes || "",
      status: t.status || "",
    };
  });
  const wb = rowsToWorkbook(rows, columns, "Financial Activity");
  const fy = fyLabel ? sanitizeFilename(fyLabel) : "All";
  downloadXlsx(wb, `Kramasha_Financial_Activity_${fy}.xlsx`);
}

export function exportFinancialCsv(transactions, display, currency, fyLabel) {
  const { eventsById, clientsById, membersById } = display;
  const typeLabels = {
    CLIENT_RECEIPT: "Client Receipt",
    TEAM_PAYMENT: "Team Payment",
    BUSINESS_EXPENSE: "Business Expense",
  };
  const columns = [
    { key: "transaction_date", label: "Date" },
    { key: "event_title", label: "Work Item" },
    { key: "type_label", label: "Type" },
    { key: "party", label: "Client/Team/Expense" },
    { key: "amount", label: "Amount" },
    { key: "payment_method", label: "Method" },
    { key: "reference_number", label: "Reference" },
    { key: "notes", label: "Notes" },
    { key: "status", label: "Status" },
  ];
  const rows = transactions.map((t) => {
    const ev = eventsById[t.event_id];
    let party = "";
    if (t.transaction_type === "CLIENT_RECEIPT") {
      party = clientsById[t.client_id]?.name || "";
    } else if (t.transaction_type === "TEAM_PAYMENT") {
      party = membersById[t.team_member_id]?.name || "";
    } else {
      party = t.expense_category_name_snapshot || "";
    }
    return {
      transaction_date: t.transaction_date || "",
      event_title: ev?.title || "",
      type_label: typeLabels[t.transaction_type] || t.transaction_type,
      party,
      amount: Number(t.amount) || 0,
      payment_method: t.payment_method || "",
      reference_number: t.reference_number || "",
      notes: t.notes || "",
      status: t.status || "",
    };
  });
  const csv = rowsToCsv(rows, columns);
  const fy = fyLabel ? sanitizeFilename(fyLabel) : "All";
  downloadCsv(csv, `Kramasha_Financial_Activity_${fy}.csv`);
}

// ---- Export: Invoices ----

export function exportInvoicesXlsx(invoices, clientsMap, eventsMap) {
  const columns = [
    { key: "invoice_number", label: "Invoice Number" },
    { key: "invoice_date", label: "Invoice Date" },
    { key: "due_date", label: "Due Date" },
    { key: "client_name", label: "Client" },
    { key: "event_title", label: "Work Item" },
    { key: "status", label: "Status" },
    { key: "grand_total", label: "Grand Total" },
    { key: "amount_paid", label: "Amount Paid" },
    { key: "balance_due", label: "Balance Due" },
  ];
  const rows = invoices.map((inv) => ({
    invoice_number: inv.invoice_number || "",
    invoice_date: inv.invoice_date || "",
    due_date: inv.due_date || "",
    client_name: clientsMap[inv.client_id]?.name || "",
    event_title: eventsMap[inv.event_id]?.title || "",
    status: inv.status || "",
    grand_total: Number(inv.grand_total) || 0,
    amount_paid: Number(inv.amount_paid) || 0,
    balance_due: Number(inv.balance_due) || 0,
  }));
  const wb = rowsToWorkbook(rows, columns, "Invoices");
  downloadXlsx(wb, `Kramasha_Invoices.xlsx`);
}

// ---- Export: Quotations ----

export function exportQuotationsXlsx(quotations, clientsMap, eventsMap) {
  const ev = eventsMap || {};
  const columns = [
    { key: "quotation_number", label: "Quotation Number" },
    { key: "quotation_date", label: "Quotation Date" },
    { key: "valid_until", label: "Valid Until" },
    { key: "client_name", label: "Client" },
    { key: "event_title", label: "Work Item" },
    { key: "project_title", label: "Project Title" },
    { key: "status", label: "Status" },
    { key: "grand_total", label: "Grand Total" },
  ];
  const rows = quotations.map((q) => ({
    quotation_number: q.quotation_number || "",
    quotation_date: q.quotation_date || "",
    valid_until: q.valid_until || "",
    client_name: clientsMap[q.client_id]?.name || "",
    event_title: ev[q.event_id]?.title || "",
    project_title: q.project_title || "",
    status: q.status || "",
    grand_total: Number(q.grand_total) || 0,
  }));
  const wb = rowsToWorkbook(rows, columns, "Quotations");
  downloadXlsx(wb, `Kramasha_Quotations.xlsx`);
}

// ---- Export: Leads ----

export function exportLeadsXlsx(leads) {
  const statusLabels = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  };
  const priorityLabels = {
    hot: "Hot",
    warm: "Warm",
    cold: "Cold",
  };
  const sourceLabels = {
    referral: "Referral",
    social_media: "Social Media",
    website: "Website",
    walk_in: "Walk-in",
    advertisement: "Advertisement",
    other: "Other",
  };
  const columns = [
    { key: "name", label: "Lead Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "source_label", label: "Source" },
    { key: "event_type", label: "Interested In" },
    { key: "event_date", label: "Tentative Event Date" },
    { key: "budget", label: "Budget" },
    { key: "status_label", label: "Status" },
    { key: "priority_label", label: "Priority" },
    { key: "next_followup_date", label: "Next Follow-up" },
    { key: "notes", label: "Notes" },
  ];
  const rows = leads.map((l) => ({
    name: l.name || "",
    phone: l.phone || "",
    email: l.email || "",
    source_label: sourceLabels[l.source] || l.source || "",
    event_type: l.event_type || "",
    event_date: l.event_date || "",
    budget: Number(l.budget) || 0,
    status_label: statusLabels[l.status] || l.status || "",
    priority_label: priorityLabels[l.priority] || l.priority || "",
    next_followup_date: l.next_followup_date || "",
    notes: l.notes || "",
  }));
  const wb = rowsToWorkbook(rows, columns, "Leads");
  downloadXlsx(wb, `Kramasha_Leads.xlsx`);
}