// Services + add-ons for one day. A day follows the event's live service list (so anything added,
// changed or removed on the event shows up here); only when the owner picks specific ones for the
// day (saved service_ids) does it show just those.
export function daySchedServices(serviceAssignments = [], services = [], savedIds = []) {
  const serviceMap = {};
  services.forEach((s) => { serviceMap[s.id] = s; });
  const seen = new Set();
  const all = [];
  serviceAssignments.forEach((a) => {
    if (a.assignment_status === "removed" || seen.has(a.service_id)) return;
    seen.add(a.service_id);
    all.push({
      id: a.service_id,
      name: serviceMap[a.service_id]?.name || a.service_name_snapshot || "Service",
      provider: a.provider_name_snapshot,
      isAddon: !!a.is_addon
    });
  });
  const custom = (savedIds || []).filter((id) => seen.has(id));
  return { all, shown: custom.length ? all.filter((x) => custom.includes(x.id)) : all, isCustom: custom.length > 0 };
}

// Function / phase title per date, taken from the quotation's items (the "Function / phase title" box on each day).
// Returns { "2026-03-12": "Haldi", ... }. Include-style rows carry a marker instead of a title and are skipped.
export function quotationDayTitles(items = []) {
  const out = {};
  items.forEach((it) => {
    const title = (it.phase_title || "").trim();
    if (!title || title === "__includes__" || !it.day_date || it.day_date === "uncategorized" || it.day_date === "__includes__") return;
    if (!out[it.day_date]) out[it.day_date] = title;
  });
  return out;
}

// What to show for a date: the title typed on the day plan, else the quotation's title for that date.
export function effectiveDayTitle(record, quoteTitles, date) {
  return (record?.title || "").trim() || (quoteTitles || {})[date] || "";
}

// "16:30:00" or "16:30" → "16:30"; anything else → "".
export const hhmm = (v) => (/^\d{1,2}:\d{2}/.test(String(v || "")) ? String(v).slice(0, 5).padStart(5, "0") : "");

// "16:30" → "04:30 PM" (12-hour, same style as the Dashboard clock).
export function formatClock(v) {
  const s = hhmm(v);
  if (!s) return "";
  const h = parseInt(s.slice(0, 2), 10);
  return `${String(h % 12 || 12).padStart(2, "0")}:${s.slice(3)} ${h < 12 ? "AM" : "PM"}`;
}

// "04:30 PM – 09:00 PM", "04:30 PM", or "" when no start time.
export function formatTimeRange(start, end) {
  const a = formatClock(start);
  if (!a) return "";
  const b = formatClock(end);
  return b ? `${a} – ${b}` : a;
}

// A day's own time when it has one, otherwise the event's. `own` tells the screen which one it is showing.
export function effectiveDayTime(record, event) {
  const ownStart = hhmm(record?.start_time);
  if (ownStart) return { start: ownStart, end: hhmm(record?.end_time), own: true };
  return { start: hhmm(event?.start_time), end: hhmm(event?.end_time), own: false };
}

// Start/end time per date from the quotation's lines (kept on every line of the day, like the phase title).
// Returns { "2026-03-12": { start: "10:00", end: "12:00" }, ... }; dates without a time are left out.
export function quotationDayTimes(items = []) {
  const out = {};
  items.forEach((it) => {
    const start = hhmm(it.day_start_time);
    if (!start || !it.day_date || it.day_date === "uncategorized" || it.day_date === "__includes__") return;
    if (!out[it.day_date]) out[it.day_date] = { start, end: hhmm(it.day_end_time) };
  });
  return out;
}

// "04:30 PM – 09:00 PM" for one event on one date (the day's own time, else the event's), or "".
export function eventTimeOn(event, date, dayAssignments = []) {
  const rec = dayAssignments.find((x) => x.event_id === event?.id && x.date === date);
  const tm = effectiveDayTime(rec, event);
  return formatTimeRange(tm.start, tm.end);
}

// The lines a share message adds for the days a person works: "Time: 10:00 AM – 12:00 PM" for one day, or one line per
// timed date ("Sat, 12 Mar (Haldi): 10:00 AM – 12:00 PM") for several. Days without any time are left out.
export function shareTimingLines(dates = [], dayAssignments = [], event) {
  const rows = dates
    .map((d) => {
      const rec = dayAssignments.find((x) => x.date === d);
      const tm = effectiveDayTime(rec, event);
      return { d, title: (rec?.title || "").trim(), text: formatTimeRange(tm.start, tm.end) };
    })
    .filter((r) => r.text);
  if (rows.length === 0) return [];
  if (dates.length === 1) return [`Time: ${rows[0].text}`];
  const short = (d) => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }); } catch { return d; } };
  return rows.map((r) => `${short(r.d)}${r.title ? ` (${r.title})` : ""}: ${r.text}`);
}
