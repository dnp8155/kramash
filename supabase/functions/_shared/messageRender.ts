// Server-side twin of renderTemplate in src/lib/messageTemplates.js: fills {details} in a template.
// Anything with no value is reported in `missing` instead of being sent as a literal "{venue}".

// Helper keys that are allowed to be empty (venue_at becomes "" when there is no venue).
const OPTIONAL = new Set(["venue_at"]);

export function renderTemplate(text: string | null | undefined, values: Record<string, string>) {
  const missing = new Set<string>();
  const out = String(text || "").replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in values)) return match;
    const v = values[key];
    if (v === undefined || v === null || v === "") {
      if (OPTIONAL.has(key)) return "";
      missing.add(key);
      return match;
    }
    return String(v);
  });
  return { text: out, missing: [...missing] };
}

const WORK_ITEM: Record<string, string> = {
  PHOTOGRAPHY: "event", EVENT_MANAGEMENT: "event", ARCHITECTURE: "project", INTERIOR: "project",
  SALON_BEAUTY: "appointment", CONSULTING: "engagement", AGENCY: "campaign", CATERING: "event",
  CONTRACTING: "project", OTHER: "project",
};

export function money(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount}`;
  }
}

export function longDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

// Same variable names as the app (TEMPLATE_VARIABLES), so one template works for a manual and an automatic send.
export function buildValues(opts: { client: any; event: any; workspace: any; amount?: number; total?: number; paid?: number; dateISO?: string; years?: number }) {
  const { client, event, workspace } = opts;
  const currency = workspace?.currency || "INR";
  const venue = event?.venue || "";
  const label = String(workspace?.custom_work_label_singular || "").trim().toLowerCase();
  return {
    name: client?.name || "",
    amount: opts.amount != null ? money(opts.amount, currency) : "",
    total: opts.total != null ? money(opts.total, currency) : "",
    paid: opts.paid != null ? money(opts.paid, currency) : "",
    event: event?.title || "",
    date: opts.dateISO ? longDate(opts.dateISO) : event?.start_date ? longDate(event.start_date) : "",
    venue,
    venue_at: venue ? ` at ${venue}` : "",
    workItem: label || WORK_ITEM[workspace?.business_category || "OTHER"] || "event",
    studio: workspace?.name || "",
    years: opts.years != null ? String(opts.years) : "",
  } as Record<string, string>;
}
