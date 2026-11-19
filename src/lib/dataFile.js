// The Kramasha data file: a plain, readable JSON (or CSV) that holds clients, events with their payments, and
// payments that belong to no event. People can write it by hand, export it from Kramasha, or convert their own
// sheet into it. Nothing in it is a database id, so it works for moving into a new account too.
//
//   { "format": "kramasha-data", "version": 1,
//     "clients": [{ "name", "phone", "email", "address", "city", "notes" }],
//     "events":  [{ "client", "title", "type", "dates": ["YYYY-MM-DD"], "venue", "contract_value", "status", "notes",
//                   "payments": [{ "date", "kind": "received" | "paid", "amount", "method", "note" }] }],
//     "misc":    [{ "date", "kind": "received" | "paid", "amount", "method", "category" }] }

import { toISODate, fyForDate, todayISO } from "@/lib/dates";

export const DATA_FORMAT = "kramasha-data";
export const DATA_VERSION = 1;
export const METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];
export const STATUSES = ["upcoming", "in-progress", "completed", "postponed", "cancelled"];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n) => String(n).padStart(2, "0");
const str = (v) => (v === null || v === undefined ? "" : String(v).trim());

// A data file is only ever read as data: it is never run, and only the fields below are copied out of it. These
// limits and the text cleaning keep a hand-made or tampered file from flooding the account or hiding anything odd.
export const LIMITS = { clients: 5000, events: 5000, paymentsPerEvent: 2000, payments: 50000, amount: 1e9, contract: 1e10 };
const TOP_LEVEL_KEYS = new Set(["format", "version", "exported_at", "clients", "events", "misc"]);

// Text from a file: no HTML tags, no control characters, no hidden or direction-switching characters, and nothing
// that a spreadsheet would run as a formula when the data is opened there later.
export function cleanText(value, max = 200, { multiline = false } = {}) {
  let s = str(value);
  if (!s) return "";
  s = s
    .replace(/<\/?[a-z!][^>]*>/gi, "")
    .replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, multiline ? "" : " ")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, "")
    .replace(multiline ? /[ \t]+/g : /\s+/g, " ")
    .trim();
  s = s.replace(/^'(?=[=+\-@])/, "").replace(/^[=+@]+/, "").replace(/^-(?=[A-Za-z(])/, "").trim();
  return s.length > max ? s.slice(0, max).trim() : s;
}
const cleanPhone = (v) => str(v).replace(/[^\d+\-() ]/g, "").slice(0, 25).trim();
const cleanEmail = (v) => {
  const e = str(v).slice(0, 200);
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e) ? e : "";
};

// ISO (2026-03-05), Indian day-first (05/03/2026, 5-3-26) or written (5 Mar 2026) → "2026-03-05", else null.
export function parseAnyDate(value) {
  const s = str(value);
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) return validYmd(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ ,-]+(\d{4})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].toLowerCase());
    return mi >= 0 ? validYmd(+m[3], mi + 1, +m[1]) : null;
  }
  return null;
}

function validYmd(y, mo, d) {
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function parseMoney(value) {
  const n = Number(str(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeMethod(value) {
  const s = str(value).toLowerCase();
  if (!s) return { method: "Cash", known: true, blank: true };
  const hit = METHODS.find((m) => m.toLowerCase() === s);
  if (hit) return { method: hit, known: true };
  if (/^(neft|rtgs|imps|bank|bank transfer|net ?banking|online)$/.test(s)) return { method: "Bank Transfer", known: true };
  if (/^(gpay|google ?pay|phonepe|paytm|upi.*)$/.test(s)) return { method: "UPI", known: true };
  if (/^(debit|credit|card.*)$/.test(s)) return { method: "Card", known: true };
  if (/^(check|cheque.*)$/.test(s)) return { method: "Cheque", known: true };
  return { method: "Other", known: false };
}

export function normalizeKind(value) {
  const s = str(value).toLowerCase();
  if (["received", "receive", "in", "income", "credit", "client_receipt"].includes(s)) return "received";
  if (["paid", "pay", "out", "expense", "debit", "business_expense", "team_payment"].includes(s)) return "paid";
  return null;
}

// Checks a parsed data file and returns the cleaned version plus every problem found, so the screen can show
// them before anything is saved. `errors` mean a row will be skipped; `warnings` mean it is kept with a note.
export function normalizeDataFile(raw) {
  const issues = [];
  const err = (where, message) => issues.push({ level: "error", where, message });
  const warn = (where, message) => issues.push({ level: "warning", where, message });
  const out = { clients: [], events: [], misc: [] };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    err("File", "This is not a Kramasha data file. It should be a JSON object with clients, events and misc lists.");
    return { data: out, issues };
  }
  if (raw.format !== DATA_FORMAT) {
    err("File", raw.format
      ? `The format says "${String(raw.format).slice(0, 40)}", but a Kramasha data file says "${DATA_FORMAT}".`
      : `This file is not marked as a Kramasha data file. Only files with "format": "${DATA_FORMAT}" are accepted. Download the example to see the layout.`);
    return { data: out, issues };
  }
  if (raw.version !== undefined && !(Number(raw.version) >= 1 && Number(raw.version) <= DATA_VERSION)) {
    err("File", "This file was made by a different version of the format, so it can not be read safely.");
    return { data: out, issues };
  }
  const unknownSections = Object.keys(raw).filter((k) => !TOP_LEVEL_KEYS.has(k));
  if (unknownSections.length) warn("File", `Ignored sections that are not part of the format and are never imported: ${unknownSections.slice(0, 5).map((k) => cleanText(k, 30)).join(", ")}.`);
  const counts = { clients: Array.isArray(raw.clients) ? raw.clients.length : 0, events: Array.isArray(raw.events) ? raw.events.length : 0 };
  if (counts.clients > LIMITS.clients || counts.events > LIMITS.events) {
    err("File", `This file has too many records (limit ${LIMITS.clients} clients and ${LIMITS.events} events per file). Split it by financial year.`);
    return { data: out, issues };
  }
  if (!Array.isArray(raw.clients) && !Array.isArray(raw.events) && !Array.isArray(raw.misc)) {
    err("File", "There are no clients, events or misc lists in this file.");
    return { data: out, issues };
  }

  const clientByKey = new Map();
  const addClient = (c) => {
    const name = cleanText(c.name, 200);
    if (!name) return null;
    const key = name.toLowerCase();
    const have = clientByKey.get(key);
    if (have) {
      const more = { phone: cleanPhone(c.phone), email: cleanEmail(c.email), address: cleanText(c.address, 300), city: cleanText(c.city, 100), notes: cleanText(c.notes, 2000, { multiline: true }) };
      for (const f of Object.keys(more)) if (!have[f] && more[f]) have[f] = more[f];
      return have;
    }
    const rec = { name, phone: cleanPhone(c.phone), email: cleanEmail(c.email), address: cleanText(c.address, 300), city: cleanText(c.city, 100), notes: cleanText(c.notes, 2000, { multiline: true }) };
    clientByKey.set(key, rec);
    out.clients.push(rec);
    return rec;
  };

  (Array.isArray(raw.clients) ? raw.clients : []).forEach((c, i) => {
    if (!addClient(c || {})) err(`Client ${i + 1}`, "Has no name, so it is skipped.");
  });

  const readPayment = (p, where, labelKey) => {
    const date = parseAnyDate(p.date);
    const amount = parseMoney(p.amount);
    const kind = normalizeKind(p.kind ?? p.type);
    if (!date) { err(where, `The date "${cleanText(p.date, 30)}" is not a date I can read. Use 2026-03-05 or 5 Mar 2026.`); return null; }
    if (!(amount > 0) || amount > LIMITS.amount) { err(where, `The amount "${cleanText(p.amount, 20)}" must be a number above zero and below ${LIMITS.amount.toLocaleString("en-IN")}.`); return null; }
    if (!kind) { err(where, `The kind "${cleanText(p.kind ?? p.type, 20)}" must be "received" or "paid".`); return null; }
    const m = normalizeMethod(p.method);
    if (!m.known) warn(where, `The method "${cleanText(p.method, 30)}" is not one I know, so it is saved as Other.`);
    return { date, kind, amount, method: m.method, [labelKey]: cleanText(p[labelKey] ?? p.note ?? p.category, 200) };
  };

  (Array.isArray(raw.events) ? raw.events : []).forEach((e, i) => {
    e = e || {};
    const title = cleanText(e.title, 200);
    const where = title ? `Event "${title}"` : `Event ${i + 1}`;
    if (!title) { err(where, "Has no title, so it is skipped."); return; }
    const dates = [...new Set((Array.isArray(e.dates) ? e.dates : [e.date ?? e.start_date]).map(parseAnyDate).filter(Boolean))].sort();
    if (dates.length === 0) { err(where, "Has no date I can read, so it is skipped. Use dates like 2026-03-05."); return; }
    const clientName = cleanText(e.client, 200) || title;
    if (!cleanText(e.client, 200)) warn(where, "Has no client, so the event title is used as the client name.");
    addClient({ name: clientName });
    const contract = e.contract_value === undefined || e.contract_value === "" ? 0 : parseMoney(e.contract_value);
    if (!(contract >= 0) || contract > LIMITS.contract) { err(where, `The contract value "${cleanText(e.contract_value, 20)}" is not a sensible number, so the event is skipped.`); return; }
    const status = str(e.status).toLowerCase();
    if (status && !STATUSES.includes(status)) warn(where, `The status "${cleanText(e.status, 20)}" is not valid, so it is worked out from the dates.`);
    const payments = [];
    if ((e.payments || []).length > LIMITS.paymentsPerEvent) { err(where, `Has more than ${LIMITS.paymentsPerEvent} payments, so it is skipped.`); return; }
    (Array.isArray(e.payments) ? e.payments : []).forEach((p, j) => {
      const rec = readPayment(p || {}, `${where}, payment ${j + 1}`, "note");
      if (rec) payments.push(rec);
    });
    out.events.push({
      client: clientName, title, type: cleanText(e.type ?? e.event_type, 100), dates, venue: cleanText(e.venue, 300), notes: cleanText(e.notes, 2000, { multiline: true }),
      contract_value: contract, status: STATUSES.includes(status) ? status : "", payments,
    });
  });

  (Array.isArray(raw.misc) ? raw.misc : []).forEach((p, i) => {
    const rec = readPayment(p || {}, `Misc entry ${i + 1}`, "category");
    if (!rec) return;
    if (!rec.category) { err(`Misc entry ${i + 1}`, "Has no category, so it is skipped."); return; }
    out.misc.push(rec);
  });

  const totalPayments = out.events.reduce((n, e) => n + e.payments.length, 0) + out.misc.length;
  if (totalPayments > LIMITS.payments) {
    err("File", `This file has ${totalPayments} payments (limit ${LIMITS.payments}). Split it by financial year.`);
    return { data: { clients: [], events: [], misc: [] }, issues };
  }
  return { data: out, issues };
}

export function summarize(data) {
  return {
    clients: data.clients.length,
    events: data.events.length,
    payments: data.events.reduce((n, e) => n + e.payments.length, 0) + data.misc.length,
  };
}

// ---- Picking one financial year out of a file ----

// An event belongs to the year its first date falls in; a misc payment to the year of its own date.
export function fyLabelsInFile(data) {
  const set = new Set();
  data.events.forEach((e) => set.add(fyForDate(e.dates[0])));
  data.misc.forEach((p) => set.add(fyForDate(p.date)));
  return [...set].filter(Boolean).sort();
}

// Keeps only that year's events (with all their payments) and misc payments, and only the clients those events use.
export function filterDataByFy(data, label) {
  if (!label || label === "all") return data;
  const events = data.events.filter((e) => fyForDate(e.dates[0]) === label);
  const used = new Set(events.map((e) => e.client.toLowerCase()));
  return {
    clients: data.clients.filter((c) => used.has(c.name.toLowerCase())),
    events,
    misc: data.misc.filter((p) => fyForDate(p.date) === label),
  };
}

// ---- Building a file from the app's own records ----

export function buildDataFile({ clients = [], events = [], transactions = [], membersById = {} }) {
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const methodOf = (t) => t.payment_method || "Cash";
  const kindOf = (t) => (t.transaction_type === "CLIENT_RECEIPT" ? "received" : "paid");
  const labelOf = (t) => {
    if (t.expense_category_name_snapshot) return t.expense_category_name_snapshot;
    if (t.transaction_type === "TEAM_PAYMENT") return `Payment to ${membersById[t.team_member_id]?.name || "team member"}`;
    return t.notes || "";
  };
  const live = transactions.filter((t) => t.status !== "VOID");
  const byEvent = {};
  const misc = [];
  for (const t of live) {
    if (t.event_id) (byEvent[t.event_id] = byEvent[t.event_id] || []).push(t);
    else if (!t.client_id) misc.push({ date: t.transaction_date, kind: kindOf(t), amount: Number(t.amount) || 0, method: methodOf(t), category: labelOf(t) || "Misc" });
  }
  const sortTx = (a, b) => String(a.transaction_date).localeCompare(String(b.transaction_date));
  return {
    format: DATA_FORMAT,
    version: DATA_VERSION,
    exported_at: new Date().toISOString(),
    clients: clients.map((c) => ({ name: c.name || "", phone: c.phone || "", email: c.email || "", address: c.address || "", city: c.city || "", notes: c.notes || "" })),
    events: events.map((e) => ({
      client: clientById[e.client_id]?.name || e.title,
      title: e.title,
      type: e.event_type || "",
      dates: (e.event_dates && e.event_dates.length ? e.event_dates : [e.start_date]).filter(Boolean).map((d) => String(d).slice(0, 10)).sort(),
      venue: e.venue || "",
      contract_value: Number(e.contract_value) || 0,
      status: e.status || "",
      notes: e.notes || "",
      payments: (byEvent[e.id] || []).slice().sort(sortTx).map((t) => ({ date: String(t.transaction_date).slice(0, 10), kind: kindOf(t), amount: Number(t.amount) || 0, method: methodOf(t), note: labelOf(t) })),
    })),
    misc: misc.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ---- CSV: one row per payment, event details repeated on each row ----

export const CSV_COLUMNS = ["client", "phone", "email", "event", "event_type", "event_dates", "venue", "contract_value", "status", "payment_date", "payment_type", "amount", "method", "note"];

const csvCell = (v) => {
  let s = v === null || v === undefined ? "" : String(v);
  // A text cell that starts like a formula would be run by Excel on opening, so it gets a leading quote.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function dataFileToCsv(file) {
  const rows = [];
  const clientByName = Object.fromEntries((file.clients || []).map((c) => [String(c.name).toLowerCase(), c]));
  const eventClients = new Set();
  for (const e of file.events || []) {
    const c = clientByName[String(e.client).toLowerCase()] || {};
    eventClients.add(String(e.client).toLowerCase());
    const base = { client: e.client, phone: c.phone || "", email: c.email || "", event: e.title, event_type: e.type, event_dates: (e.dates || []).join(";"), venue: e.venue, contract_value: e.contract_value, status: e.status };
    if (!e.payments || e.payments.length === 0) rows.push(base);
    for (const p of e.payments || []) rows.push({ ...base, payment_date: p.date, payment_type: p.kind, amount: p.amount, method: p.method, note: p.note });
  }
  for (const c of file.clients || []) {
    if (!eventClients.has(String(c.name).toLowerCase())) rows.push({ client: c.name, phone: c.phone, email: c.email });
  }
  for (const p of file.misc || []) rows.push({ payment_date: p.date, payment_type: p.kind, amount: p.amount, method: p.method, note: p.category });
  return [CSV_COLUMNS.join(","), ...rows.map((r) => CSV_COLUMNS.map((k) => csvCell(r[k])).join(","))].join("\r\n");
}

// A small CSV reader that handles quoted cells, commas and line breaks inside quotes, and a leading BOM.
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  const s = String(text || "").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false; }
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export function csvToDataFile(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "This CSV has no rows. The first line must be the column names." };
  const header = rows[0].map((h) => str(h).toLowerCase().replace(/[\s-]+/g, "_"));
  const idx = (name) => header.indexOf(name);
  if (idx("event") < 0 && idx("client") < 0 && idx("payment_date") < 0) {
    return { error: `The first line must contain column names such as ${CSV_COLUMNS.slice(0, 5).join(", ")}…` };
  }
  const get = (r, name) => (idx(name) >= 0 ? str(r[idx(name)]) : "");
  const clients = new Map();
  const events = new Map();
  const misc = [];
  for (const r of rows.slice(1)) {
    const client = get(r, "client"), event = get(r, "event");
    if (client && !clients.has(client.toLowerCase())) clients.set(client.toLowerCase(), { name: client, phone: get(r, "phone"), email: get(r, "email") });
    const payment = get(r, "payment_date") || get(r, "amount") ? { date: get(r, "payment_date"), kind: get(r, "payment_type"), amount: get(r, "amount"), method: get(r, "method"), note: get(r, "note") } : null;
    if (!event) {
      if (payment) misc.push({ date: payment.date, kind: payment.kind, amount: payment.amount, method: payment.method, category: payment.note });
      continue;
    }
    const dates = get(r, "event_dates").split(/[;|]/).map((d) => d.trim()).filter(Boolean);
    const key = `${client.toLowerCase()}|${event.toLowerCase()}|${dates.join(";")}`;
    if (!events.has(key)) events.set(key, { client, title: event, type: get(r, "event_type"), dates, venue: get(r, "venue"), contract_value: get(r, "contract_value"), status: get(r, "status"), payments: [] });
    if (payment) events.get(key).payments.push(payment);
  }
  return { file: { format: DATA_FORMAT, version: DATA_VERSION, clients: [...clients.values()], events: [...events.values()], misc } };
}

// ---- The example shown to people who want to write their own file ----

export function exampleDataFile() {
  return {
    format: DATA_FORMAT,
    version: DATA_VERSION,
    clients: [
      { name: "Rohan Mehta", phone: "9876500000", email: "rohan@example.com", city: "Vadodara", notes: "Referred by a friend" },
      { name: "Isha Shah", phone: "", email: "", city: "Surat" },
    ],
    events: [
      {
        client: "Rohan Mehta",
        title: "Rohan & Isha Wedding",
        type: "Wedding",
        dates: ["2026-02-08", "2026-02-09"],
        venue: "Grand Palace, Vadodara",
        contract_value: 150000,
        status: "completed",
        notes: "Candid + traditional, album included",
        payments: [
          { date: "2026-01-10", kind: "received", amount: 50000, method: "UPI", note: "Advance" },
          { date: "2026-02-09", kind: "received", amount: 80000, method: "Bank Transfer", note: "Second payment" },
          { date: "2026-02-10", kind: "paid", amount: 12000, method: "Cash", note: "Payment to assistant photographer" },
        ],
      },
      { client: "Isha Shah", title: "Maternity Shoot", type: "Maternity", dates: ["2026-03-15"], contract_value: 12000, payments: [] },
    ],
    misc: [
      { date: "2026-04-02", kind: "paid", amount: 15000, method: "UPI", category: "Studio rent" },
      { date: "2026-04-20", kind: "received", amount: 3500, method: "Cash", category: "Print sales" },
    ],
  };
}

export function downloadText(text, filename, type) {
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" + text : text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const todayStamp = () => todayISO();
