// Where an event happens, gathered from every place the app lets the owner write it, so notifications, the AI assistant
// and the calendar all say the same thing.
//
// For one day, the first of these that has text wins:
//   1. the job sheet's venue for that date
//   2. the venue on the event's Team-by-date page (event_day_assignments.venue_override)
//   3. the event's main details: Venue, plus Venue Address when there is one
//   4. the venue / address saved on the event's quotation
// Nothing found anywhere = empty text, and callers simply leave the place out.

import { supabaseAdmin } from "./supabaseClient.ts";

export type PlaceInfo = { main: string; days: Record<string, string> };

const t = (v: unknown) => String(v ?? "").trim();

// "Grand Palace" + "Race Course Rd, Vadodara" -> "Grand Palace, Race Course Rd, Vadodara" (no repeat when one holds the other)
export function joinPlace(name: unknown, address: unknown): string {
  const a = t(name), b = t(address);
  if (!a) return b;
  if (!b) return a;
  if (a.toLowerCase().includes(b.toLowerCase())) return a;
  if (b.toLowerCase().includes(a.toLowerCase())) return b;
  return `${a}, ${b}`;
}

const asObject = (v: unknown): Record<string, any> => {
  if (v && typeof v === "object") return v as Record<string, any>;
  try { const p = JSON.parse(String(v || "")); return p && typeof p === "object" ? p : {}; } catch { return {}; }
};

// events: rows of the events table. Returns { [event_id]: PlaceInfo }.
export async function loadPlaces(workspaceId: string, events: any[]): Promise<Record<string, PlaceInfo>> {
  const out: Record<string, PlaceInfo> = {};
  const ids = (events || []).map((e) => e.id).filter(Boolean);
  if (ids.length === 0) return out;
  const safe = async (q: PromiseLike<{ data: any }>) => { try { return (await q).data || []; } catch { return []; } };
  const [dayRows, sheets, quotes] = await Promise.all([
    safe(supabaseAdmin.from("event_day_assignments").select("event_id, date, venue_override").eq("workspace_id", workspaceId).in("event_id", ids).limit(3000)),
    safe(supabaseAdmin.from("job_sheets").select("event_id, date_configs").eq("workspace_id", workspaceId).in("event_id", ids).limit(1000)),
    safe(supabaseAdmin.from("quotations").select("event_id, event_snapshot, updated_at").eq("workspace_id", workspaceId).in("event_id", ids).order("updated_at", { ascending: false }).limit(2000)),
  ]);
  for (const e of events) {
    let main = joinPlace(e.venue, e.venue_address);
    if (!main) {
      for (const q of quotes.filter((x: any) => x.event_id === e.id)) {
        const snap = asObject(q.event_snapshot);
        main = joinPlace(snap.venue, snap.venue_address);
        if (main) break;
      }
    }
    const days: Record<string, string> = {};
    for (const r of dayRows.filter((x: any) => x.event_id === e.id)) {
      const v = t(r.venue_override);
      if (v) days[String(r.date).slice(0, 10)] = v;
    }
    for (const s of sheets.filter((x: any) => x.event_id === e.id)) {
      const cfg = asObject(s.date_configs);
      for (const [date, c] of Object.entries(cfg)) {
        const v = t((c as any)?.venue_override);
        if (v) days[String(date).slice(0, 10)] = v; // the job sheet's venue wins over the Team-by-date one
      }
    }
    out[e.id] = { main, days };
  }
  return out;
}

export const placeOn = (info: PlaceInfo | undefined, date: string): string => (info ? info.days[date] || info.main : "") || "";

// One line for several dates: the single place when every date shares it, otherwise "Day 1: A · Day 2: B".
export function placeSummary(info: PlaceInfo | undefined, dates: string[]): string {
  if (!info) return "";
  const list = [...new Set(dates)].sort();
  const places = list.map((d) => placeOn(info, d));
  const distinct = [...new Set(places.filter(Boolean))];
  if (distinct.length === 0) return "";
  if (distinct.length === 1 && places.every(Boolean)) return distinct[0];
  if (list.length === 1) return places[0];
  return list.map((d, i) => (places[i] ? `Day ${i + 1}: ${places[i]}` : "")).filter(Boolean).join(" · ");
}
