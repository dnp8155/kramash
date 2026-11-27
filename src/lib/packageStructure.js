import { lineTotal as quotationLineTotal } from "@/lib/quotationCalc";

// Helpers for a package's saved structure: structure_json = [{ day_date, phase_title, items: [...] }].
// "uncategorized" is the general group, "__includes__" holds Includes / Deliverables (same marker the quotation uses).
export const INCLUDES_GROUP = "__includes__";
export const GENERAL_GROUP = "uncategorized";

export function parseGroups(json) {
  try {
    const days = typeof json === "string" ? JSON.parse(json || "[]") : (json || []);
    return Array.isArray(days) ? days.map((d) => ({ ...d, items: Array.isArray(d.items) ? d.items : [] })) : [];
  } catch {
    return [];
  }
}

// Same rule as the quotation: days multiply only for "Per Day" rates, everything else is quantity x rate.
export const lineTotal = quotationLineTotal;

export function packageTotal(groups) {
  return groups.reduce((sum, g) => sum + g.items.reduce((s, it) => s + lineTotal(it), 0), 0);
}

// A fresh row for the package editor. "role" is a team slot by role name (no person), "custom" is any other line.
export function newItem(kind = "custom") {
  return {
    item_type: kind, reference_id: "", team_member_id: null, team_member_name_snapshot: "", member_type: "",
    name: "", description: "", quantity: 1, days: 1, unit_rate: 0, rate_type: "Fixed", gst_rate: 0, sac_code: "", is_addon: false,
  };
}

// Rows without a name are dropped; empty groups go with them. Numbers are cleaned so a stray "" never reaches the quotation.
export function buildStructure(groups) {
  const cleaned = groups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => String(it.name || "").trim())
        .map((it) => ({
          ...it,
          name: String(it.name).trim(),
          quantity: Math.max(1, Number(it.quantity) || 1),
          days: Math.max(1, Number(it.days) || 1),
          unit_rate: Math.max(0, Number(it.unit_rate) || 0),
        })),
    }))
    .filter((g) => g.items.length > 0);
  return cleaned.length ? JSON.stringify(cleaned) : "";
}

// Adds a row to the general group, creating it when the package has none yet.
export function addItemToGeneral(groups, item) {
  const idx = groups.findIndex((g) => g.day_date === GENERAL_GROUP);
  if (idx >= 0) return groups.map((g, i) => (i === idx ? { ...g, items: [...g.items, item] } : g));
  return [{ day_date: GENERAL_GROUP, phase_title: "", items: [item] }, ...groups];
}

// What a client sees: day sections in order ("Day 1", "Day 2"… for dated groups), a general list, and the includes.
// Roles show by role name only, never a person. `prices` adds each line's amount.
// Each section is split into parts: Team (role / team slots) first, then Services (services and other items).
export const isTeamItem = (it) => it?.item_type === "role" || it?.item_type === "team";
export function clientSections(groups, { prices = false } = {}) {
  const sections = [];
  const includes = [];
  const dated = groups.filter((g) => g.day_date !== INCLUDES_GROUP && g.day_date !== GENERAL_GROUP);
  for (const g of groups) {
    if (g.day_date === INCLUDES_GROUP) {
      for (const it of g.items) includes.push(`${(Number(it.quantity) || 1) > 1 ? `${it.quantity}× ` : ""}${it.name}`);
      continue;
    }
    const isGeneral = g.day_date === GENERAL_GROUP;
    const title = isGeneral ? "" : (g.phase_title || `Day ${dated.indexOf(g) + 1}`);
    const toLine = (it) => {
      const qty = Number(it.quantity) || 1;
      const days = it.rate_type === "Per Day" ? (Number(it.days) || 1) : 1;
      const detail = [qty > 1 ? `${qty} nos` : "", days > 1 ? `${days} days` : ""].filter(Boolean).join(" · ");
      // Quotation-style team rows keep the ROLE in description and may keep a person in name: show the role only.
      const name = it.item_type === "team" ? (it.description || it.member_type || "Team member") : (it.name || ""); // never the person in name
      return { name, detail, note: it.item_type === "team" ? "" : (it.description || ""), amount: prices ? lineTotal(it) : null };
    };
    const team = g.items.filter(isTeamItem).map(toLine);
    const services = g.items.filter((it) => !isTeamItem(it)).map(toLine);
    const parts = [
      ...(team.length ? [{ label: "Team", lines: team }] : []),
      ...(services.length ? [{ label: "Services", lines: services }] : []),
    ];
    sections.push({ title, parts, lines: [...team, ...services] });
  }
  return { sections: sections.filter((s) => s.lines.length > 0), includes };
}

// The price you charge for the package. Left empty it is the items' total; typed in, it replaces that total and the
// difference is your margin (the quotation's "Set subtotal (manual)" works the same way).
export const parseOverride = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Math.max(0, Number(v)));
export const packagePrice = (groups, override) => parseOverride(override) ?? packageTotal(groups);
// True when a custom price is set and differs from the items' total, so item amounts would not add up to it.
export const hasMargin = (groups, override) => { const o = parseOverride(override); return o !== null && Math.abs(o - packageTotal(groups)) > 0.004; };

// In-app previews: the same order the client card uses. Includes / Deliverables rows (day_date "__includes__") get their own group.
export function groupItemsTeamFirst(items = []) {
  const includes = items.filter((it) => it.day_date === INCLUDES_GROUP);
  const rest = items.filter((it) => it.day_date !== INCLUDES_GROUP);
  return [
    { key: "team", label: "Team", items: rest.filter(isTeamItem) },
    { key: "services", label: "Services", items: rest.filter((it) => !isTeamItem(it)) },
    { key: "includes", label: "Includes / Deliverables", items: includes },
  ].filter((g) => g.items.length > 0);
}
