// The timing, place and crew of each day of an event, for the portals' "Add to calendar".
// A day's own time (the event's Day plan) is listed per date; the event's own start/end time is the common time for
// days that have none. The place of each day is worked out like everywhere else (see eventPlace.ts: job sheet, then
// Team-by-date, then event details, then the quotation). Crew names are included only when the owner switched
// "show team names" on for the job sheet. No amounts, no notes.

import { supabaseAdmin } from "./supabaseClient.ts";
import { loadPlaces, placeOn } from "./eventPlace.ts";

const hhmm = (v: unknown) => (/^\d{1,2}:\d{2}/.test(String(v || "")) ? String(v).slice(0, 5).padStart(5, "0") : "");

export type DayPlan = {
  start_time: string; end_time: string;
  venue_address: string; // where the event happens overall (details, else quotation), kept under its old name
  days: Record<string, { start_time: string; end_time: string; venue: string; place: string; title: string; team: string[] }>;
};

// events: rows from the events table. Returns { [event_id]: DayPlan }.
export async function loadDayPlans(workspaceId: string, events: any[]): Promise<Record<string, DayPlan>> {
  const out: Record<string, DayPlan> = {};
  const ids = (events || []).map((e) => e.id).filter(Boolean);
  if (ids.length === 0) return out;
  let rows: any[] = [];
  try {
    const { data } = await supabaseAdmin.from("event_day_assignments")
      .select("event_id, date, start_time, end_time, venue_override, title, team_member_ids")
      .eq("workspace_id", workspaceId).in("event_id", ids).limit(2000);
    rows = data || [];
  } catch { rows = []; }
  const places = await loadPlaces(workspaceId, events).catch(() => ({} as Record<string, any>));

  // Crew names, only for events whose job sheet shows team names.
  const namesOn = new Set<string>();
  const nameOf: Record<string, string> = {};
  try {
    const { data: sheets } = await supabaseAdmin.from("job_sheets").select("event_id, show_team_names").eq("workspace_id", workspaceId).in("event_id", ids).limit(1000);
    (sheets || []).filter((s: any) => s.show_team_names).forEach((s: any) => namesOn.add(s.event_id));
    if (namesOn.size > 0) {
      const memberIds = [...new Set(rows.filter((r) => namesOn.has(r.event_id)).flatMap((r) => r.team_member_ids || []))];
      if (memberIds.length > 0) {
        const { data: members } = await supabaseAdmin.from("team_members").select("id, name").eq("workspace_id", workspaceId).in("id", memberIds).limit(1000);
        (members || []).forEach((m: any) => { nameOf[m.id] = String(m.name || "").trim(); });
      }
    }
  } catch { /* names are optional */ }

  for (const e of events) {
    const days: DayPlan["days"] = {};
    for (const r of rows.filter((x) => x.event_id === e.id)) {
      const date = String(r.date).slice(0, 10);
      const start = hhmm(r.start_time);
      const entry = {
        start_time: start, end_time: start ? hhmm(r.end_time) : "",
        venue: String(r.venue_override || "").trim(), place: placeOn(places[e.id], date), title: String(r.title || "").trim(),
        team: namesOn.has(e.id) ? (r.team_member_ids || []).map((id: string) => nameOf[id]).filter(Boolean) : [],
      };
      if (entry.start_time || entry.venue || entry.place || entry.title || entry.team.length) days[date] = entry;
    }
    // Days with no row of their own still have a place (the job sheet's, or the event's).
    for (const d of Object.keys(places[e.id]?.days || {})) {
      if (!days[d]) days[d] = { start_time: "", end_time: "", venue: "", place: placeOn(places[e.id], d), title: "", team: [] };
      else if (!days[d].place) days[d].place = placeOn(places[e.id], d);
    }
    out[e.id] = { start_time: hhmm(e.start_time), end_time: hhmm(e.start_time) ? hhmm(e.end_time) : "", venue_address: places[e.id]?.main || "", days };
  }
  return out;
}
