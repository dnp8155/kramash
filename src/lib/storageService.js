// Storage: which drive / folder each job's files are saved in. Drives are set up once (Preferences → Business
// Setup); each event then has one or more locations (drive + folder path + subfolders + what the copy is).
import { base44 } from "@/api/base44Client";
import { normalize } from "@/lib/fuzzySearch";
import { resolveBusinessCategory } from "@/lib/businessTerminology";

export const DRIVE_KINDS = [
  { value: "hdd", label: "Hard drive" },
  { value: "ssd", label: "SSD" },
  { value: "card", label: "Memory card / pen drive" },
  { value: "nas", label: "NAS / server" },
  { value: "cloud", label: "Cloud" },
  { value: "other", label: "Other" },
];

export const DRIVE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

export const COPY_ROLES = [
  { value: "original", label: "Original" },
  { value: "backup", label: "Backup" },
  { value: "edited", label: "Final version" },
  { value: "delivered", label: "Shared with client" },
];

// Example subfolder names per business type, used as the placeholder and one-tap suggestions so the form reads
// naturally for every category. (The folder example is common to all: year / client / job.)
const STORAGE_EXAMPLES = {
  PHOTOGRAPHY: { subfolders: ["RAW", "Selects", "Edited"] },
  EVENT_MANAGEMENT: { subfolders: ["Contracts", "Vendor quotes", "Run of show"] },
  ARCHITECTURE: { subfolders: ["CAD drawings", "3D renders", "Site photos"] },
  INTERIOR: { subfolders: ["Moodboards", "Drawings", "Site photos"] },
  SALON_BEAUTY: { subfolders: ["Before & after", "Consent forms", "Product notes"] },
  CONSULTING: { subfolders: ["Contracts", "Reports", "Working files"] },
  AGENCY: { subfolders: ["Brand assets", "Designs", "Reports"] },
  CATERING: { subfolders: ["Menus", "Quotes", "Invoices"] },
  CONTRACTING: { subfolders: ["Drawings", "Site photos", "Permits & bills"] },
  OTHER: { subfolders: ["Documents", "Photos", "Invoices"] },
};

export const storageExamples = (workspace) => STORAGE_EXAMPLES[resolveBusinessCategory(workspace)] || STORAGE_EXAMPLES.OTHER;

// A drive type is one of the listed kinds, or any text the person typed (stored as-is).
export const kindLabel = (k) => DRIVE_KINDS.find((x) => x.value === k)?.label || (k ? String(k) : "Drive");
// What was typed back to the stored value: a listed label becomes its code, anything else is kept as typed.
export const kindFromText = (text) => {
  const v = String(text || "").trim();
  if (!v) return "other";
  const hit = DRIVE_KINDS.find((x) => x.label.toLowerCase() === v.toLowerCase() || x.value === v.toLowerCase());
  return hit ? hit.value : v.slice(0, 40);
};
export const roleLabel = (r) => COPY_ROLES.find((x) => x.value === r)?.label || "Original";

export async function loadDrives(workspaceId) {
  if (!workspaceId) return [];
  const rows = await base44.entities.StorageDrive.filter({ workspace_id: workspaceId }, "sort_order", 200);
  return rows || [];
}

export async function loadLocations(workspaceId) {
  if (!workspaceId) return [];
  const rows = await base44.entities.StorageLocation.filter({ workspace_id: workspaceId }, "-created_date", 2000);
  return rows || [];
}

// subfolders is stored as JSON; always hand back an array of { name, note }.
export function parseSubfolders(v) {
  let arr = v;
  if (typeof v === "string") { try { arr = JSON.parse(v); } catch { arr = []; } }
  return Array.isArray(arr) ? arr.filter((s) => s && String(s.name || "").trim()).map((s) => ({ name: String(s.name).trim(), note: String(s.note || "").trim() })) : [];
}

// "Drive A / 2026 / Client name / Job" — the one-line way to say where it is.
export function locationLabel(loc, drive) {
  const name = drive?.name || loc.drive_name_snapshot || "Unknown drive";
  return [name, loc.folder_path].filter(Boolean).join(" / ");
}

// Everything searchable about a location in one string (drive, path, subfolders, notes, event, client).
export function locationSearchText(loc, { drive, event, client } = {}) {
  return [
    drive?.name || loc.drive_name_snapshot, drive ? kindLabel(drive.kind) : "", roleLabel(loc.copy_role),
    loc.folder_path, loc.note,
    ...parseSubfolders(loc.subfolders).flatMap((s) => [s.name, s.note]),
    event?.title, event?.event_type, event?.venue, client?.name,
  ].filter(Boolean).join(" ");
}

// How many separate places hold this event's files. Two entries on the same drive count once.
export function copyCount(locations) {
  return new Set(locations.map((l) => l.drive_id || l.drive_name_snapshot || l.id)).size;
}

// Search: every word typed must be found (anywhere, any order) in the location's drive / folder / subfolder / note /
// event / client text. A word also matches a one-letter typo in a word of 4+ letters (a typo like "clent" still finds "client").
const tokenize = (s) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
const withinOne = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

export function searchLocations(rows, query, getText = (r) => r._searchText) {
  const words = tokenize(query);
  if (words.length === 0) return rows;
  const scored = [];
  for (const row of rows) {
    const text = normalize(getText(row));
    const tokens = tokenize(text);
    let score = 0;
    let all = true;
    for (const w of words) {
      if (tokens.some((t) => t.startsWith(w))) score += 3;
      else if (text.includes(w)) score += 2;
      else if (w.length >= 4 && tokens.some((t) => withinOne(w, t))) score += 1;
      else { all = false; break; }
    }
    if (all) scored.push({ row, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.row);
}

// ---- Sizes (stored in GB) ----
export const SIZE_UNITS = [
  { value: "MB", perGb: 1 / 1024 },
  { value: "GB", perGb: 1 },
  { value: "TB", perGb: 1024 },
];
const unitFactor = (unit) => SIZE_UNITS.find((u) => u.value === unit)?.perGb ?? 1;

// What was typed ("500", "1.5") and its unit → GB, or null when empty / not a number.
export function toGb(text, unit = "GB") {
  const n = parseFloat(String(text ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n * unitFactor(unit) * 1000) / 1000 : null;
}

// A stored GB value back to the form: whole TB shown as TB, otherwise GB (or MB when under 1 GB).
export function fromGb(gb) {
  const n = Number(gb);
  if (gb == null || gb === "" || !Number.isFinite(n)) return { text: "", unit: "GB" };
  if (n >= 1024 && Number.isInteger(n / 1024)) return { text: String(n / 1024), unit: "TB" };
  if (n > 0 && n < 1) return { text: String(Math.round(n * 1024)), unit: "MB" };
  return { text: String(n), unit: "GB" };
}

// "850 GB", "1.4 TB", "512 MB".
export function formatSize(gb) {
  const n = Number(gb);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1024) return `${+(n / 1024).toFixed(2)} TB`;
  if (Math.abs(n) < 1 && n !== 0) return `${Math.round(n * 1024)} MB`;
  return `${+n.toFixed(1)} GB`;
}

// Used = sum of the sizes told for folders on this drive. capacity/available/percent are null when the drive's size isn't known.
export function driveUsage(drive, locations) {
  const mine = locations.filter((l) => l.drive_id === drive.id);
  const used = mine.reduce((s, l) => s + (Number(l.size_gb) || 0), 0);
  const unsized = mine.filter((l) => l.size_gb == null || l.size_gb === "").length;
  const capacity = drive.capacity_gb == null || drive.capacity_gb === "" ? null : Number(drive.capacity_gb);
  const available = capacity == null ? null : capacity - used;
  const percent = capacity ? Math.min(100, Math.round((used / capacity) * 100)) : null;
  return { used, unsized, capacity, available, percent };
}

// ---- Overview (like a phone's Storage screen: one bar split by colour, then a list sorted by size) ----
export const ROLE_COLORS = { original: "#3B82F6", backup: "#10B981", edited: "#F59E0B", delivered: "#8B5CF6" };
const sizeOf = (l) => Number(l.size_gb) || 0;

// One drive's used space split by what each copy is (original / backup / final / shared), biggest first.
export function driveBreakdown(drive, locations) {
  const by = {};
  for (const l of locations) if (l.drive_id === drive.id) by[l.copy_role || "original"] = (by[l.copy_role || "original"] || 0) + sizeOf(l);
  return Object.entries(by).filter(([, gb]) => gb > 0).map(([role, gb]) => ({ role, gb })).sort((a, b) => b.gb - a.gb);
}

// All drives together: used / total / available, plus each drive's share for the coloured bar.
// "Total" and "available" only count drives whose size was entered, so a drive with no size can't skew them.
export function overallUsage(drives, locations) {
  const per = drives.map((d) => ({ drive: d, ...driveUsage(d, locations) }));
  const sized = per.filter((p) => p.capacity != null && p.capacity > 0);
  const capacity = sized.reduce((s, p) => s + p.capacity, 0);
  const usedOnSized = sized.reduce((s, p) => s + p.used, 0);
  const usedAll = per.reduce((s, p) => s + p.used, 0);
  return {
    per: per.filter((p) => p.used > 0).sort((a, b) => b.used - a.used),
    capacity: capacity || null,
    used: capacity ? usedOnSized : usedAll,
    usedAll,
    usedOnUnsized: usedAll - usedOnSized,
    available: capacity ? capacity - usedOnSized : null,
    unsizedDrives: per.length - sized.length,
  };
}

// Jobs that take the most space, biggest first: [{ eventId, gb, copies }].
export function biggestJobs(locations, limit = 5) {
  const by = new Map();
  for (const l of locations) {
    if (!l.event_id || sizeOf(l) <= 0) continue;
    const cur = by.get(l.event_id) || { eventId: l.event_id, gb: 0, copies: 0 };
    cur.gb += sizeOf(l); cur.copies += 1;
    by.set(l.event_id, cur);
  }
  return [...by.values()].sort((a, b) => b.gb - a.gb).slice(0, limit);
}
