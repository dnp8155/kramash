// CSV/Excel export utility for KRAMAS.
// Generates CSV files with BOM for Excel compatibility. Only exports the
// authenticated workspace's data — callers are responsible for passing
// pre-filtered, workspace-scoped rows.

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

// Convert an array of row objects to CSV using the given column definitions.
// columns: [{ key, label }] — key is the property path, label is the header.
export function rowsToCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
}

// Download a CSV string as a file.
export function downloadCsv(csv, filename) {
  // BOM for Excel UTF-8 compatibility.
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

// Export events to CSV. `term` is the resolved business terminology for the
// active workspace (column headers + filename adapt to the work-item label).
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
  downloadCsv(csv, `KRAMAS_${prefix}_${fy}.csv`);
}

// Export clients to CSV.
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
  downloadCsv(csv, `KRAMAS_Clients.csv`);
}

// Export team members to CSV.
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
  downloadCsv(csv, `KRAMAS_Team.csv`);
}

// Export financial transactions to CSV.
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
  downloadCsv(csv, `KRAMAS_Financial_Activity_${fy}.csv`);
}