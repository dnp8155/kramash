// Rebuilds src/constants/holidays/<CODE>.json from Google's public holiday calendars (needs network; run with `node scripts/buildHolidays.mjs`).
// Each file is a list of [date, name, main] where main is 1 for a public holiday and 0 for an observance / regional festival.
// The app bundles these files, so nothing is fetched at run time. Re-run once a year to add new years.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCES = { IN: "indian", AE: "ae", SA: "saudiarabian", QA: "qa", KW: "kw", OM: "om", BH: "bh", GB: "uk", US: "usa", CA: "canadian", AU: "australian", SG: "singapore", MY: "malaysia", NP: "np", LK: "lk", BD: "bd", PK: "pk", NZ: "new_zealand", ZA: "sa" };
const FROM = 2025, TO = 2030;
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/constants/holidays");

for (const [code, id] of Object.entries(SOURCES)) {
  const res = await fetch(`https://calendar.google.com/calendar/ical/en.${id}%23holiday%40group.v.calendar.google.com/public/basic.ics`);
  const txt = (await res.text()).replace(/\r?\n[ \t]/g, "");
  const seen = new Set(), rows = [];
  for (const b of txt.split("BEGIN:VEVENT").slice(1)) {
    const g = (k) => { const m = b.match(new RegExp(`\\n${k}[^:\\n]*:(.*)`)); return m ? m[1].trim() : ""; };
    const d = g("DTSTART"), y = Number(d.slice(0, 4));
    if (!/^\d{8}$/.test(d) || y < FROM || y > TO) continue;
    const name = g("SUMMARY").replace(/\\,/g, ",").replace(/\;/g, ";");
    const main = g("DESCRIPTION").startsWith("Public holiday") ? 1 : 0;
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const key = date + name;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    rows.push([date, name, main]);
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]) || b[2] - a[2]);
  fs.writeFileSync(path.join(outDir, `${code}.json`), JSON.stringify(rows));
  console.log(code, rows.length, `${rows.filter((r) => r[2]).length} public`);
}
