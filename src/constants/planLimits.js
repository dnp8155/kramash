// Every setting a plan can carry (the plan_limits table), with the wording the admin Plans page shows.
// Numbers are limits (999999 = unlimited); switches turn a feature on or off for the plan.
// Keep in step with BOOLEAN_KEYS in src/lib/planService.js and the plan_limit_key enum in the database.
export const PLAN_LIMIT_DEFS = [
  { key: "max_events", label: "Max Events", hint: "Use 999999 for unlimited", type: "number" },
  { key: "max_team_members", label: "Max Team Members", hint: "Use 999999 for unlimited", type: "number" },
  { key: "max_services", label: "Max Services", hint: "Use 999999 for unlimited", type: "number" },
  { key: "max_leads", label: "Max Leads", hint: "Use 999999 for unlimited", type: "number" },
  { key: "max_storage_gb", label: "Database Storage (GB)", hint: "Total DB storage in GB (e.g. 5, 50)", type: "number" },
  { key: "pdf_export_enabled", label: "PDF Export", hint: "Always on, PDF export is available on every plan", type: "boolean" },
  { key: "reminders_enabled", label: "Reminders", hint: "Event reminders", type: "boolean" },
  { key: "notifications_enabled", label: "Notifications", hint: "In-app and push notifications", type: "boolean" },
  { key: "link_sharing_enabled", label: "Link Sharing", hint: "Public links for quotations, invoices and job sheets", type: "boolean" },
  { key: "client_portal_enabled", label: "Client Portal", hint: "Password-protected client portal links", type: "boolean" },
  { key: "team_portal_enabled", label: "Team Member Portal", hint: "Password-protected team portal links", type: "boolean" },
  { key: "excel_csv_export_enabled", label: "Excel & CSV Export", hint: "Export lists and reports to Excel or CSV", type: "boolean" },
  { key: "event_display_customization_enabled", label: "Display Customization", hint: "Display options in Preferences (status colours, dots, grouping)", type: "boolean" },
  { key: "quotation_logo_enabled", label: "Branding Image / Logo", hint: "Logo on quotations, invoices and My Profile", type: "boolean" },
  { key: "advanced_theme_enabled", label: "Night & Pastel Themes", hint: "Night and Pastel themes in Preferences", type: "boolean" },
  { key: "client_email_enabled", label: "Email Clients from Gmail", hint: "Connect Gmail and email clients: manual, scheduled and automatic", type: "boolean" },
];

export const PLAN_LIMIT_BY_KEY = Object.fromEntries(PLAN_LIMIT_DEFS.map((d) => [d.key, d]));
export const isBooleanLimit = (key) => PLAN_LIMIT_BY_KEY[key]?.type === "boolean";
// Stored flags are "true"/"false" and, in older rows, "1"/"0".
export const isFlagOn = (value) => ["true", "1"].includes(String(value).toLowerCase());
// Position in the list above; settings the page does not know yet go last.
export const limitOrder = (key) => { const i = PLAN_LIMIT_DEFS.findIndex((d) => d.key === key); return i < 0 ? PLAN_LIMIT_DEFS.length : i; };

// A change that reaches every customer on a plan the moment it is saved. Returns the sentence to confirm with, or ""
// for a harmless one. Switching a feature off on a paid plan, switching one on for Free, or lowering a paid plan's
// limit all count; anything else (e.g. a Free limit going up) is just saved.
export function limitChangeWarning({ planCode, planName, key, from, to }) {
  const def = PLAN_LIMIT_BY_KEY[key];
  const label = def?.label || key;
  const paid = planCode !== "FREE";
  if (def?.type === "boolean") {
    const was = isFlagOn(from), now = isFlagOn(to);
    if (paid && was && !now) return `Turn off "${label}" for everyone on ${planName}? They lose it as soon as you save.`;
    if (!paid && !was && now) return `Turn on "${label}" for everyone on ${planName}? Every Free user gets it as soon as you save.`;
    return "";
  }
  const a = Number(from), b = Number(to);
  if (paid && Number.isFinite(a) && Number.isFinite(b) && b < a) return `Lower "${label}" from ${a} to ${b} for everyone on ${planName}? It applies as soon as you save.`;
  return "";
}
