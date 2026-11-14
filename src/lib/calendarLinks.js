// "Add to calendar" for the client and team portals. Like the By date plan on the events page, every day is its own
// entry (Day 1, Day 2 …), with the day's title when there is one. Everything is built in the browser from dates the
// portal already shows: a .ics file (Apple Calendar, Outlook, Google) and Google Calendar links. A day with a start time
// (its own in the event's Day plan, else the event's common time) becomes a timed entry; a day without one stays an
// all-day entry. No amounts or prices are ever included.

const pad = (n) => String(n).padStart(2, "0");
const ymd = (iso) => String(iso).slice(0, 10);
const compact = (iso) => ymd(iso).replace(/-/g, "");

function addDay(iso, n = 1) {
  const [y, m, d] = ymd(iso).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// Every date from `start` to `end` inclusive (a project with only a start and end date).
export function datesBetween(start, end) {
  if (!start) return [];
  const last = end && ymd(end) >= ymd(start) ? ymd(end) : ymd(start);
  const out = [];
  for (let d = ymd(start); d <= last && out.length < 366; d = addDay(d)) out.push(d);
  return out;
}

// One entry per day, in date order: { date, summary }. Several days read "Sharma Wedding – Day 2: Reception" (or
// "– Day 2 of 3" when the day has no title); a single day is just the title (plus its day title, if any).
// event: { title, dates, dayTitles: { "YYYY-MM-DD": "Haldi" }, venue, dayPlan }
// dayPlan (optional) = { start_time, end_time, venue_address, days: { "YYYY-MM-DD": { start_time, end_time, venue, title } } }:
// the event's common time plus what each day sets for itself. A day's own value wins, otherwise the common one is used.
// Each entry also carries: start/end ("HH:MM" or ""), and place (where that day happens), dayTitle and team.
export function eventDays({ title, dates = [], dayTitles = {}, venue = "", dayPlan = null }) {
  const days = [...new Set((dates || []).filter(Boolean).map(ymd))].sort();
  const base = title || "Event";
  return days.map((date, i) => {
    const plan = dayPlan?.days?.[date] || {};
    const day = String(dayTitles?.[date] || plan.title || "").trim();
    let summary = base;
    if (days.length > 1) summary = `${base} – Day ${i + 1}${day ? `: ${day}` : ` of ${days.length}`}`;
    else if (day) summary = `${base} – ${day}`;
    const own = hhmm(plan.start_time);
    const start = own || hhmm(dayPlan?.start_time);
    const end = start ? (own ? hhmm(plan.end_time) : hhmm(dayPlan?.end_time)) : "";
    // Where this day happens: the server works it out (job sheet, Team-by-date, event details, quotation); older data
    // falls back to the day's own venue, then the event's venue.
    const place = String(plan.place || plan.venue || venue || dayPlan?.venue_address || "").trim();
    return { date, summary, start, end, place, dayTitle: day, team: Array.isArray(plan.team) ? plan.team : [] };
  });
}

const hhmm = (v) => (/^\d{1,2}:\d{2}/.test(String(v || "")) ? String(v).slice(0, 5).padStart(5, "0") : "");

// This day's place is the entry's location. The description lists the event day by day: "Day 1 – Haldi", its time, where,
// and who works (names only when the owner shows team names), then the event's own description.
function placeAndNotes(event, day) {
  const all = eventDays(event);
  const blocks = all.map((d, i) => {
    const head = all.length > 1 ? `Day ${i + 1}${d.dayTitle ? ` – ${d.dayTitle}` : ""}` : (d.dayTitle || "Details");
    const lines = [head];
    if (d.start) lines.push(`Time: ${d.start}${d.end ? ` – ${d.end}` : ""}`);
    if (d.place) lines.push(`Venue: ${d.place}`);
    if (d.team.length) lines.push(`Team: ${d.team.join(", ")}`);
    return lines.length > 1 ? lines.join("\n") : "";
  }).filter(Boolean);
  const notes = [];
  if (blocks.length) notes.push(blocks.join("\n\n"));
  if (event.description) notes.push(event.description);
  return { location: day.place, description: notes.join("\n\n") };
}

// "20261224T103000" for a start/end on a date. The end falls on the next day when it is not after the start (an overnight
// event); with no end time the entry lasts an hour.
function timedRange(day) {
  const startMin = Number(day.start.slice(0, 2)) * 60 + Number(day.start.slice(3));
  let endMin = day.end ? Number(day.end.slice(0, 2)) * 60 + Number(day.end.slice(3)) : startMin + 60;
  let endDate = day.date;
  if (endMin <= startMin) { endMin += day.end ? 1440 : 0; }
  if (endMin >= 1440) { endMin -= 1440; endDate = addDay(day.date); }
  const stamp = (date, min) => `${compact(date)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
  return { from: stamp(day.date, startMin), to: stamp(endDate, endMin) };
}

const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes are folded (a CRLF and a space), as the format requires.
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; }
    cur += ch;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

// event: { title, dates, dayTitles, venue, description, uid }. One all-day entry per day (the end of an all-day entry is the day after).
export function buildIcs(event) {
  const { uid, title } = event;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const base = String(uid || title || "event").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "event";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kramasha//Portal//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const day of eventDays(event)) {
    const { location, description } = placeAndNotes(event, day);
    lines.push("BEGIN:VEVENT", `UID:${base}-${compact(day.date)}@kramasha.com`, `DTSTAMP:${stamp}`);
    if (day.start) {
      const r = timedRange(day); // floating time: the clock time shown is the clock time on the calendar
      lines.push(`DTSTART:${r.from}`, `DTEND:${r.to}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(day.date)}`, `DTEND;VALUE=DATE:${compact(addDay(day.date))}`);
    }
    lines.push(`SUMMARY:${esc(day.summary)}`);
    if (location) lines.push(`LOCATION:${esc(location)}`);
    if (description) lines.push(`DESCRIPTION:${esc(description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(event, filename = "event") {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${String(filename).replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 60) || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A Google Calendar "create event" link for one day (a link can hold only one entry).
export function googleCalendarUrl(event, date) {
  const day = eventDays(event).find((d) => d.date === ymd(date || ""));
  if (!day) return null;
  let dates = `${compact(day.date)}/${compact(addDay(day.date))}`;
  if (day.start) { const r = timedRange(day); dates = `${r.from}/${r.to}`; }
  const q = new URLSearchParams({ action: "TEMPLATE", text: day.summary, dates });
  const { location, description } = placeAndNotes(event, day);
  if (location) q.set("location", location);
  if (description) q.set("details", description);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
