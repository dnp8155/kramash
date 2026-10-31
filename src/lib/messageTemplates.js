import { base44 } from "@/api/base44Client";
import { getProfile } from "@/lib/businessTypeProfiles";

// Client message templates (email subject + body, also used for WhatsApp text).
// Wording adapts to the business category through {workItem} ("event", "appointment", "project"...).
// Studios can edit any template or add their own; those are stored on the workspace in
// display_preferences.message_templates, so the defaults below are never overwritten.

export const TEMPLATE_VARIABLES = [
  { key: "name", label: "Client name" },
  { key: "amount", label: "Amount due" },
  { key: "total", label: "Total value" },
  { key: "paid", label: "Paid so far" },
  { key: "event", label: "Title" },
  { key: "date", label: "Date" },
  { key: "venue", label: "Venue" },
  { key: "workItem", label: "Event / project word" },
  { key: "years", label: "Years since (anniversary)" },
  { key: "doc", label: "Quotation / invoice number" },
  { key: "link_line", label: "Link to the document (if shared)" },
  { key: "studio", label: "Your business name" },
];

const DEFAULT_TEMPLATES = [
  {
    id: "payment_reminder",
    name: "Payment reminder",
    subject: "Payment reminder: {event}",
    body:
      "Hi {name},\n\nThis is a gentle reminder about the pending balance of {amount} for your {workItem} \"{event}\".\n\nKindly let us know once the payment is done. Thank you!\n\n{studio}",
  },
  {
    id: "upcoming_reminder",
    name: "Upcoming reminder",
    subject: "Reminder: {event} on {date}",
    body:
      "Hi {name},\n\nA quick reminder that your {workItem} \"{event}\" is scheduled for {date}{venue_at}.\n\nPlease reach out if anything has changed. See you soon!\n\n{studio}",
  },
  {
    id: "thank_you",
    name: "Thank you",
    subject: "Thank you from {studio}",
    body:
      "Hi {name},\n\nThank you for choosing {studio} for your {workItem} \"{event}\". It was a pleasure working with you.\n\nWe would love to hear your feedback, and please reach out any time you need us again.\n\n{studio}",
  },
  {
    id: "quotation_share",
    name: "Send quotation",
    subject: "Quotation {doc}: {event}",
    body:
      "Hi {name},\n\nPlease find our quotation {doc} for your {workItem} \"{event}\" (total {total}).{link_line}\n\nLet us know if you would like any changes and we will be happy to update it.\n\n{studio}",
  },
  {
    id: "invoice_share",
    name: "Send invoice",
    subject: "Invoice {doc}: {event}",
    body:
      "Hi {name},\n\nPlease find invoice {doc} for your {workItem} \"{event}\". Total {total}, balance due {amount}.{link_line}\n\nThank you!\n\n{studio}",
  },
  {
    id: "anniversary",
    name: "Anniversary wish",
    subject: "Happy anniversary from {studio}",
    body:
      "Hi {name},\n\nIt has been {years} year(s) since your {workItem} \"{event}\" on {date}. Wishing you many more happy years ahead!\n\n{studio}",
  },
];

// Per-category tweaks to a default template (anything not listed uses the default text).
const CATEGORY_OVERRIDES = {
  SALON_BEAUTY: {
    upcoming_reminder: {
      body: "Hi {name},\n\nA quick reminder of your appointment on {date}.\n\nPlease let us know if you need to reschedule. See you soon!\n\n{studio}",
    },
    thank_you: {
      body: "Hi {name},\n\nThank you for visiting {studio}! We hope you loved your look.\n\nWe would love to hear your feedback, and we look forward to seeing you again.\n\n{studio}",
    },
  },
  CONSULTING: {
    upcoming_reminder: {
      body: "Hi {name},\n\nA reminder that our session \"{event}\" is scheduled for {date}.\n\nPlease let us know if you need to reschedule.\n\n{studio}",
    },
  },
  CONTRACTING: {
    upcoming_reminder: {
      body: "Hi {name},\n\nA reminder that work on \"{event}\" is scheduled for {date}{venue_at}.\n\nPlease make sure the site is accessible. Thank you!\n\n{studio}",
    },
  },
};

// A workspace with no category yet keeps anniversary, so nobody loses it by accident.
export function categorySupportsAnniversary(category) {
  return !category || getProfile(category).supportsAnniversary !== false;
}

function readPrefs(workspace) {
  try {
    const raw = workspace?.display_preferences;
    return (!raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw)) || {};
  } catch {
    return {};
  }
}

// Default templates for a business category, in display order.
export function defaultTemplates(category) {
  const over = CATEGORY_OVERRIDES[category] || {};
  const anniversaryOk = categorySupportsAnniversary(category);
  return DEFAULT_TEMPLATES.filter((t) => t.id !== "anniversary" || anniversaryOk).map((t) => ({ ...t, ...(over[t.id] || {}), isDefault: true }));
}

// Defaults (with the studio's edits applied) followed by the studio's own templates.
// Stored shape: { [id]: { name?, subject, body } }. An id that matches a default edits it;
// any other id is a template the studio made.
export function getTemplates(workspace, category) {
  const saved = readPrefs(workspace).message_templates || {};
  const defaults = defaultTemplates(category).map((t) => {
    const s = saved[t.id];
    return s ? { ...t, subject: s.subject ?? t.subject, body: s.body ?? t.body, edited: true } : t;
  });
  const defaultIds = new Set(defaults.map((t) => t.id));
  const own = Object.entries(saved)
    .filter(([id]) => !defaultIds.has(id))
    .map(([id, s]) => ({ id, name: s.name || "My template", subject: s.subject || "", body: s.body || "", isDefault: false }));
  return [...defaults, ...own];
}

// Returns the new message_templates map to store after saving `tpl` (id, name, subject, body).
export function withTemplateSaved(workspace, tpl) {
  const saved = { ...(readPrefs(workspace).message_templates || {}) };
  saved[tpl.id] = { name: tpl.name, subject: tpl.subject, body: tpl.body };
  return saved;
}

export function withTemplateRemoved(workspace, id) {
  const saved = { ...(readPrefs(workspace).message_templates || {}) };
  delete saved[id];
  return saved;
}

export function mergeMessageTemplates(workspace, messageTemplates) {
  const prefs = { ...readPrefs(workspace), message_templates: messageTemplates };
  // Automatic rules carry a copy of their template text (the server has no template list), so refresh it.
  if (prefs.message_automation) prefs.message_automation = withTemplateSnapshots(prefs.message_automation, getTemplates({ display_preferences: prefs }, workspace?.business_category));
  return JSON.stringify(prefs);
}

// Fills {variables}. Returns the text plus the names of variables that had no value, so the
// preview can warn instead of sending "{venue}" to a client.
// Helper keys that are allowed to be empty (venue_at becomes "" when there is no venue).
const OPTIONAL_VARIABLES = new Set(["venue_at", "link_line"]);

export function renderTemplate(text, values) {
  const missing = new Set();
  const out = String(text || "").replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in values)) return match; // not a known variable: leave it visible
    const v = values[key];
    if (v === undefined || v === null || v === "") {
      if (OPTIONAL_VARIABLES.has(key)) return "";
      missing.add(key);
      return match;
    }
    return String(v);
  });
  return { text: out, missing: [...missing] };
}

// A template that talks about "{years}" (the anniversary one, or a copy of it) only makes sense once the event
// is at least a year old, so the Send message sheet leaves it out until then.
export const templateNeedsYears = (tpl) => /\{years\}/.test(`${tpl?.subject || ""}${tpl?.body || ""}`);

// The same for "{doc}": the send-quotation and send-invoice templates only make sense when a quotation or invoice is being shared.
export const templateNeedsDoc = (tpl) => /\{doc\}/.test(`${tpl?.subject || ""}${tpl?.body || ""}`);

// {venue_at} is a helper that becomes " at <venue>" or nothing, so templates read well without a venue.
export function buildValues({ client, event, workspace, term, amount, total, paid, dateLabel, years, doc, link }) {
  const venue = [event?.venue].filter(Boolean).join("");
  return {
    name: client?.name || "",
    amount,
    total,
    paid,
    event: event?.title || "",
    date: dateLabel,
    venue,
    venue_at: venue ? ` at ${venue}` : "",
    workItem: (term?.workItemSingular || "event").toLowerCase(),
    studio: workspace?.name || "",
    years: years == null ? "" : String(years),
    doc: doc || "",
    link_line: link ? `\n\nView it here: ${link}` : "",
  };
}

// Saves the whole message_templates map on the workspace and updates the shared workspace state, so the
// Send message dialog and the Preferences list both see the change straight away.
export async function saveMessageTemplates(workspace, setWorkspace, messageTemplates) {
  const next = mergeMessageTemplates(workspace, messageTemplates);
  await base44.entities.Workspace.update(workspace.id, { display_preferences: next });
  setWorkspace((w) => ({ ...w, display_preferences: next }));
}

// Example values for previews outside a real client / event (the Preferences template editor).
export function sampleValues({ workspace, term }) {
  return {
    name: "Priya Sharma",
    amount: "₹25,000",
    total: "₹75,000",
    paid: "₹50,000",
    event: `Sharma ${term?.workItemSingular || "Event"}`,
    date: "12 Dec 2026",
    venue: "Grand Palace",
    venue_at: " at Grand Palace",
    workItem: (term?.workItemSingular || "event").toLowerCase(),
    studio: workspace?.name || "Your Studio",
    years: "1",
    doc: "QT-2026-0001",
    link_line: "\n\nView it here: https://www.kramasha.com/q/example",
  };
}

// ---- Automatic messages (Preferences → Business → Connections → Automation) ----
// Stored on the workspace as display_preferences.message_automation = { send_hour, rules: { [rule]: {...} } }.
// The cron job (runMessageAutomation) reads it, so each rule keeps a copy of its template's subject/body.

export const AUTOMATION_RULES = [
  {
    key: "payment_due", title: "Payment reminders", hint: "When a payment milestone is due or overdue.",
    defaults: { channel: "email", before_days: 2, on_due: true, overdue_every_days: 3, overdue_max: 3, template_id: "payment_reminder" },
  },
  {
    key: "event_upcoming", title: "Coming up", hint: "Before the event, project or appointment starts.",
    defaults: { channel: "email", before_days: 1, template_id: "upcoming_reminder" },
  },
  {
    key: "thank_you", title: "Thank you", hint: "After it is over.",
    defaults: { channel: "email", after_days: 2, template_id: "thank_you" },
  },
  {
    key: "anniversary", title: "Anniversary", hint: "On the yearly date of a past event, such as a wedding.",
    defaults: { channel: "email", template_id: "anniversary" },
  },
];

export const DEFAULT_SEND_HOUR = 10;

// The automatic messages that make sense for a business category (e.g. no anniversary for architects).
export function rulesForCategory(category) {
  const anniversaryOk = categorySupportsAnniversary(category);
  return AUTOMATION_RULES.filter((r) => r.key !== "anniversary" || anniversaryOk);
}

export function getAutomation(workspace) {
  const saved = readPrefs(workspace).message_automation || {};
  const rules = {};
  for (const r of AUTOMATION_RULES) rules[r.key] = { enabled: false, ...r.defaults, ...(saved.rules?.[r.key] || {}) };
  return { enabled: saved.enabled !== false, send_hour: saved.send_hour ?? DEFAULT_SEND_HOUR, rules };
}

// Copies each rule's current template text into the rule (see above).
export function withTemplateSnapshots(automation, templates) {
  const rules = {};
  for (const [key, rule] of Object.entries(automation?.rules || {})) {
    const tpl = templates.find((t) => t.id === rule.template_id);
    rules[key] = tpl ? { ...rule, template_name: tpl.name, subject: tpl.subject || "", body: tpl.body || "" } : rule;
  }
  return { ...automation, rules };
}

export async function saveAutomation(workspace, setWorkspace, automation) {
  const templates = getTemplates(workspace, workspace?.business_category);
  const next = JSON.stringify({ ...readPrefs(workspace), message_automation: withTemplateSnapshots(automation, templates) });
  await base44.entities.Workspace.update(workspace.id, { display_preferences: next });
  setWorkspace((w) => ({ ...w, display_preferences: next }));
}
