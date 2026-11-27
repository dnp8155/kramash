// Where an event happens, gathered from every place the app lets the owner write it (mirror of
// supabase/functions/_shared/eventPlace.ts, which does the same for notifications and the AI assistant).
// For one day, the first with text wins:
//   1. the job sheet's venue for that date
//   2. the venue on the event's Team-by-date page (a day's venue)
//   3. the event's main details: Venue, plus Venue Address when there is one
//   4. the venue / address saved on the event's quotation
// Nothing anywhere = empty text; callers leave the place out.

const t = (v) => String(v ?? "").trim();

export function joinPlace(name, address) {
  const a = t(name), b = t(address);
  if (!a) return b;
  if (!b) return a;
  if (a.toLowerCase().includes(b.toLowerCase())) return a;
  if (b.toLowerCase().includes(a.toLowerCase())) return b;
  return `${a}, ${b}`;
}

const asObject = (v) => {
  if (v && typeof v === "object") return v;
  try { const p = JSON.parse(String(v || "")); return p && typeof p === "object" ? p : {}; } catch { return {}; }
};

// -> { main, days: { "YYYY-MM-DD": "its own place" } }
export function resolvePlaces({ event, dayAssignments = [], jobSheet = null, quotations = [] }) {
  let main = joinPlace(event?.venue, event?.venue_address);
  if (!main) {
    for (const q of quotations || []) {
      const snap = asObject(q.event_snapshot);
      main = joinPlace(snap.venue, snap.venue_address);
      if (main) break;
    }
  }
  const days = {};
  for (const r of dayAssignments || []) {
    const v = t(r.venue_override);
    if (v && r.date) days[String(r.date).slice(0, 10)] = v;
  }
  const cfg = asObject(jobSheet?.date_configs);
  for (const [date, c] of Object.entries(cfg)) {
    const v = t(c?.venue_override);
    if (v) days[String(date).slice(0, 10)] = v; // the job sheet's venue wins
  }
  return { main, days };
}

export const placeOn = (info, date) => (info ? info.days[date] || info.main : "") || "";
