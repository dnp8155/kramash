// Holidays & festivals for the Team availability calendar. The lists are bundled JSON (one file per country, built by
// scripts/buildHolidays.mjs) and only the chosen country's file is downloaded, when holidays are switched on.
// Each row is [date, name, main]: main is 1 for a public holiday and 0 for a regional festival or observance.

export const HOLIDAY_COUNTRIES = [
  { code: "IN", label: "India", names: ["india", "bharat"] },
  { code: "AE", label: "UAE (Dubai, Abu Dhabi…)", names: ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah"] },
  { code: "SA", label: "Saudi Arabia", names: ["saudi arabia", "saudi", "ksa"] },
  { code: "QA", label: "Qatar", names: ["qatar"] },
  { code: "KW", label: "Kuwait", names: ["kuwait"] },
  { code: "OM", label: "Oman", names: ["oman"] },
  { code: "BH", label: "Bahrain", names: ["bahrain"] },
  { code: "GB", label: "United Kingdom", names: ["united kingdom", "uk", "england", "scotland", "wales", "great britain"] },
  { code: "US", label: "United States", names: ["united states", "usa", "us", "america"] },
  { code: "CA", label: "Canada", names: ["canada"] },
  { code: "AU", label: "Australia", names: ["australia"] },
  { code: "NZ", label: "New Zealand", names: ["new zealand"] },
  { code: "SG", label: "Singapore", names: ["singapore"] },
  { code: "MY", label: "Malaysia", names: ["malaysia"] },
  { code: "NP", label: "Nepal", names: ["nepal"] },
  { code: "LK", label: "Sri Lanka", names: ["sri lanka"] },
  { code: "BD", label: "Bangladesh", names: ["bangladesh"] },
  { code: "PK", label: "Pakistan", names: ["pakistan"] },
  { code: "ZA", label: "South Africa", names: ["south africa"] },
];

export const holidayCountryLabel = (code) => HOLIDAY_COUNTRIES.find((c) => c.code === code)?.label || code || "";

// The country the workspace is set to ("India", "United Arab Emirates"…), as a holiday list code. "" when none fits.
export function holidayCodeForCountry(country) {
  const n = String(country || "").trim().toLowerCase();
  if (!n) return "";
  return HOLIDAY_COUNTRIES.find((c) => c.code.toLowerCase() === n || c.names.includes(n))?.code || "";
}

const files = import.meta.glob("../constants/holidays/*.json");
const cache = new Map();

export async function loadHolidayRows(code) {
  if (!code) return [];
  if (cache.has(code)) return cache.get(code);
  const load = files[`../constants/holidays/${code}.json`];
  if (!load) return [];
  const p = load().then((m) => m.default || m).catch(() => { cache.delete(code); return []; });
  cache.set(code, p);
  return p;
}

// { "2026-11-08": [{ name: "Diwali/Deepavali", main: true }, …] }. Without `regional`, only public holidays are kept.
export function groupHolidays(rows, regional) {
  const out = {};
  for (const [date, name, main] of rows) {
    if (!main && !regional) continue;
    (out[date] ||= []).push({ name, main: !!main });
  }
  return out;
}
