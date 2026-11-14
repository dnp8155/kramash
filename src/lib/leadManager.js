// Pure helpers for the lead manager (follow-ups, ready messages, pipeline summary). No network, easy to test.
import { LEAD_STATUSES, MESSAGE_TEMPLATES } from "@/constants/leadConfig";

const CLOSED = new Set(["won", "lost"]);
export const isOpenLead = (l) => !CLOSED.has(l?.status);

export function leadDates(lead) {
  const list = Array.isArray(lead?.event_dates) && lead.event_dates.length ? lead.event_dates : (lead?.event_date ? [lead.event_date] : []);
  return [...list].sort();
}

// Open leads whose follow-up date has come: overdue (before today) and due today, most overdue first.
export function classifyFollowUps(leads, todayISO) {
  const overdue = [];
  const today = [];
  for (const l of leads || []) {
    if (!isOpenLead(l) || !l.next_followup_date) continue;
    const d = String(l.next_followup_date).slice(0, 10);
    if (d < todayISO) overdue.push(l);
    else if (d === todayISO) today.push(l);
  }
  const byDate = (a, b) => String(a.next_followup_date).localeCompare(String(b.next_followup_date));
  return { overdue: overdue.sort(byDate), today: today.sort(byDate) };
}

// Fills a template for a lead. `[[ … ]]` parts are kept only when every placeholder inside has a value.
export function buildLeadMessage(templateKey, { lead, business = "", dateText = "" }) {
  const tpl = MESSAGE_TEMPLATES.find((m) => m.key === templateKey) || MESSAGE_TEMPLATES[0];
  const values = {
    name: String(lead?.name || "").trim().split(/\s+/)[0] || "there",
    business: business || "our team",
    event: String(lead?.event_type || "").trim().toLowerCase(),
    date: dateText,
  };
  const withOptional = tpl.text.replace(/\[\[(.*?)\]\]/g, (_, part) => {
    const keys = [...part.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    return keys.every((k) => values[k]) ? part : "";
  });
  return withOptional.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "").replace(/\s{2,}/g, " ").replace(/\s+([?.!,])/g, "$1").trim();
}

// Numbers for the Insights view.
export function computeLeadInsights(leads) {
  const list = leads || [];
  const count = (s) => list.filter((l) => l.status === s).length;
  const won = count("won");
  const lost = count("lost");
  const closed = won + lost;

  const stages = LEAD_STATUSES.map((s) => ({ status: s, count: count(s) }));

  const reasons = {};
  list.filter((l) => l.status === "lost").forEach((l) => {
    const k = l.lost_reason || "unspecified";
    reasons[k] = (reasons[k] || 0) + 1;
  });
  const lostReasons = Object.entries(reasons).map(([reason, n]) => ({ reason, count: n })).sort((a, b) => b.count - a.count);

  const bySource = {};
  list.forEach((l) => {
    const k = l.source || "other";
    bySource[k] ||= { source: k, total: 0, won: 0 };
    bySource[k].total += 1;
    if (l.status === "won") bySource[k].won += 1;
  });
  const sources = Object.values(bySource).sort((a, b) => b.total - a.total);

  return {
    total: list.length,
    active: list.filter(isOpenLead).length,
    won, lost,
    // Won out of the leads that were decided either way — open leads don't drag the rate down.
    conversionRate: closed > 0 ? Math.round((won / closed) * 100) : null,
    stages, lostReasons, sources,
  };
}
