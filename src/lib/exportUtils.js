// Excel/CSV export utility for Kramasha.
// Generates real .xlsx files (via SheetJS) and CSV files (with BOM for Excel).
// Only exports the authenticated workspace's data — callers are responsible
// for passing pre-filtered, workspace-scoped rows.

import * as XLSX from "xlsx";

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

// ---- Export: Events ----

export function exportEventsXlsx(events, clientsMap, fyLabel, term) {
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
  const wb = rowsToWorkbook(rows, columns, workPlural);
  const fy = fyLabel ? sanitizeFilename(fyLabel) : "All";
  const prefix = sanitizeFilename(t.exportPrefix || workPlural);
  downloadXlsx(wb, `Kramasha_${prefix}_${fy}.xlsx`);
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

export function exportClientsXlsx(clients, eventCounts) {
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
  const rows = members.map((m) => ({
    name: m.name || "",
    role: rolesMap[m.role_id]?.name || m.profession || "",
    phone: m.phone || "",
    email: m.email || "",
    default_rate: m.default_rate || 0,
    rate_type: m.rate_type || "",
    status: m.status || "",
  }));
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

export function exportQuotationsXlsx(quotations, clientsMap) {
  const columns = [
    { key: "quotation_number", label: "Quotation Number" },
    { key: "quotation_date", label: "Quotation Date" },
    { key: "valid_until", label: "Valid Until" },
    { key: "client_name", label: "Client" },
    { key: "project_title", label: "Project Title" },
    { key: "status", label: "Status" },
    { key: "grand_total", label: "Grand Total" },
  ];
  const rows = quotations.map((q) => ({
    quotation_number: q.quotation_number || "",
    quotation_date: q.quotation_date || "",
    valid_until: q.valid_until || "",
    client_name: clientsMap[q.client_id]?.name || "",
    project_title: q.project_title || "",
    status: q.status || "",
    grand_total: Number(q.grand_total) || 0,
  }));
  const wb = rowsToWorkbook(rows, columns, "Quotations");
  downloadXlsx(wb, `Kramasha_Quotations.xlsx`);
}