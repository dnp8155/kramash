// "Add to calendar" for the client and team portals. Like the By date plan on the events page, every day is its own
// entry (Day 1, Day 2 …), with the day's title when there is one. Everything is built in the browser from dates the
// portal already shows: a .ics file (Apple Calendar, Outlook, Google) and Google Calendar links. The portals only know
// dates (no clock times), so these are all-day entries. No amounts or prices are ever included.

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
// event: { title, dates, dayTitles: { "YYYY-MM-DD": "Haldi" } }
export function eventDays({ title, dates = [], dayTitles = {} }) {
  const days = [...new Set((dates || []).filter(Boolean).map(ymd))].sort();
  const base = title || "Event";
  return days.map((date, i) => {
    const day = String(dayTitles?.[date] || "").trim();
    let summary = base;
    if (days.length > 1) summary = `${base} – Day ${i + 1}${day ? `: ${day}` : ` of ${days.length}`}`;
    else if (day) summary = `${base} – ${day}`;
    return { date, summary };
  });
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
  const { venue, description, uid, title } = event;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const base = String(uid || title || "event").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "event";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kramasha//Portal//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const day of eventDays(event)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${base}-${compact(day.date)}@kramasha.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(day.date)}`,
      `DTEND;VALUE=DATE:${compact(addDay(day.date))}`,
      `SUMMARY:${esc(day.summary)}`,
    );
    if (venue) lines.push(`LOCATION:${esc(venue)}`);
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
  const q = new URLSearchParams({ action: "TEMPLATE", text: day.summary, dates: `${compact(day.date)}/${compact(addDay(day.date))}` });
  if (event.venue) q.set("location", event.venue);
  if (event.description) q.set("details", event.description);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
