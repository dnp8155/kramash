// CSV/Excel export utilities for Kramashah.
// Generates CSV files from workspace-scoped data and triggers a browser download.
// CSV is opened natively by Excel/Google Sheets — no external library needed.

// Convert a 2D array (rows of cells) into a CSV string.
function toCSV(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return "";
          const s = String(cell);
          // Escape quotes and wrap in quotes if the cell contains comma, quote, or newline.
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");
}

// Trigger a browser download for the given CSV content.
function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Sanitize a string for use in a filename (remove special chars, limit length).
export function sanitizeFilename(str) {
  return (str || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

// ─── Events Export ───
// Accepts an optional terminology object (t) for dynamic labels/filenames.
export function exportEventsCSV(events, clients, fyLabel, t) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const workLabel = t?.workItemSingular || "Event";
  const headers = [`${workLabel} Name`, "Client", "Start Date", "End Date", t?.locationLabel || "Venue", "Type", "Status"];
  const rows = events.map((e) => [
    e.title || "",
    clientMap[e.client_id]?.name || "",
    e.start_date || "",
    e.end_date || "",
    e.venue || "",
    e.event_type || "",
    e.status || "",
  ]);
  const csv = toCSV([headers, ...rows]);
  const fyPart = fyLabel && fyLabel !== "all" ? `_FY-${sanitizeFilename(fyLabel)}` : "";
  const filenamePart = t?.exportFilename || "Events";
  downloadCSV(csv, `Kramashah_${filenamePart}${fyPart}.csv`);
}

// ─── Clients Export ───
export function exportClientsCSV(clients, events) {
  const eventCountByClient = {};
  for (const e of events) {
    if (e.client_id) eventCountByClient[e.client_id] = (eventCountByClient[e.client_id] || 0) + 1;
  }
  const headers = ["Client Name", "Phone", "Alternate Phone", "Email", "City", "State", "Event Count"];
  const rows = clients.map((c) => [
    c.name || "",
    c.phone || "",
    c.alternate_phone || "",
    c.email || "",
    c.city || "",
    c.state || "",
    eventCountByClient[c.id] || 0,
  ]);
  const csv = toCSV([headers, ...rows]);
  downloadCSV(csv, "Kramashah_Clients.csv");
}

// ─── Team Export ───
export function exportTeamCSV(members, roles) {
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r]));
  const headers = ["Name", "Role", "Phone", "Email", "Default Rate", "Rate Type", "Status"];
  const rows = members.map((m) => {
    const role = roleMap[m.role_id];
    return [
      m.name || "",
      role?.name || m.profession || "",
      m.phone || "",
      m.email || "",
      m.default_rate ?? "",
      m.rate_type || "",
      m.status || "",
    ];
  });
  const csv = toCSV([headers, ...rows]);
  downloadCSV(csv, "Kramashah_Team.csv");
}

// ─── Financial Transactions Export ───
export function exportFinancialCSV(transactions, events, clients, members, categories, fyLabel, t) {
  const eventMap = Object.fromEntries(events.map((e) => [e.id, e]));
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const typeLabels = {
    CLIENT_RECEIPT: "Client Receipt",
    TEAM_PAYMENT: "Team Payment",
    BUSINESS_EXPENSE: "Business Expense",
  };

  const workLabel = t?.workItemSingular || "Event";
  const headers = [
    "Date",
    workLabel,
    "Transaction Type",
    "Party / Description",
    "Amount",
    "Payment Method",
    "Reference",
    "Status",
    "Notes",
  ];
  const rows = transactions.map((t) => {
    const ev = eventMap[t.event_id];
    let party = "";
    if (t.transaction_type === "CLIENT_RECEIPT") {
      party = clientMap[t.client_id]?.name || "";
    } else if (t.transaction_type === "TEAM_PAYMENT") {
      party = memberMap[t.team_member_id]?.name || "";
    } else {
      party = catMap[t.expense_category_id]?.name || "";
    }
    return [
      t.transaction_date || "",
      ev?.title || "",
      typeLabels[t.transaction_type] || t.transaction_type || "",
      party,
      t.amount ?? "",
      t.payment_method || "",
      t.reference_number || "",
      t.status || "",
      t.notes || "",
    ];
  });
  const csv = toCSV([headers, ...rows]);
  const fyPart = fyLabel && fyLabel !== "all" ? `_FY-${sanitizeFilename(fyLabel)}` : "";
  downloadCSV(csv, `Kramashah_Financial_Activity${fyPart}.csv`);
}