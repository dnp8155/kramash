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
