// What a client is allowed to see of a quotation, applied the same way on screen and in the PDF
// they download: hidden team names collapse to roles ("2× Lead Photographer"), "show pricing"
// off hides prices, and each section follows its "show in link" switch.

import { parseSnapshot } from "@/lib/quotationService";

// Collapse team items to their role and service items to their name, merging identical rows
// into a "N × Label" count. (Same rows, same rate, same type merge; different rates stay apart.)
export function groupForHiddenNames(items) {
  const groups = [];
  const index = new Map();
  for (const it of items || []) {
    if (it.item_type !== "team" && it.item_type !== "service") {
      groups.push(it);
      continue;
    }
    const label = it.item_type === "team" ? (it.description || "Team Member") : (it.name || "Service");
    const key = `${it.item_type}:${it.day_date || ""}:${label}:${it.unit_rate}:${it.rate_type}`;
    if (index.has(key)) {
      const g = groups[index.get(key)];
      g._count = (g._count || 1) + 1;
      g.quantity = (Number(g.quantity) || 0) + (Number(it.quantity) || 0);
      g.line_total = (Number(g.line_total) || 0) + (Number(it.line_total) || 0);
    } else {
      index.set(key, groups.length);
      groups.push({ ...it, _count: 1, _label: label });
    }
  }
  return groups;
}

// Items ready for a client PDF: when names are hidden, rows carry only role/service labels.
export function itemsForClientPdf(items, hideTeamNames) {
  if (!hideTeamNames) return items || [];
  return groupForHiddenNames(items).map((it) => {
    if (!it._label) return it;
    const count = it._count || 1;
    return {
      ...it,
      name: `${count} × ${it._label}`,
      description: "",
      team_member_name_snapshot: "",
      _grouped: true,
    };
  });
}

// Builds everything generateQuotationPdf needs from the public-link response, so the client's
// PDF matches the owner's: real business (logo, tagline, contact), client, event, bank details,
// social links and payment schedule — limited to what the owner chose to show in the link.
export async function generateClientQuotationPdf(data, { returnBlob = false } = {}) {
  const q = data.quotation;
  const business = parseSnapshot(q.business_snapshot) || {};
  const client = parseSnapshot(q.client_snapshot) || {};
  const event = parseSnapshot(q.event_snapshot) || {};

  let cfg = {};
  try { cfg = q.template_config ? (typeof q.template_config === "string" ? JSON.parse(q.template_config) : q.template_config) : {}; } catch { cfg = {}; }
  const vis = cfg.visibility || {};
  // The templates read "show in PDF"; a link download follows "show in link".
  const linkVisibility = {};
  for (const key of new Set(["terms", "special_notes", "payment_conditions", "bank", "social", "footer", ...Object.keys(vis)])) {
    linkVisibility[key] = { ...(vis[key] || {}), pdf: vis[key]?.link !== false };
  }
  const templateConfig = { ...cfg, visibility: linkVisibility };

  const quotation = {
    ...q,
    template_config: JSON.stringify(templateConfig),
    bank_details_snapshot: q.bank_details ? JSON.stringify(q.bank_details) : (q.bank_details_snapshot || ""),
    social_links_snapshot: q.social_links ? JSON.stringify(q.social_links) : (q.social_links_snapshot || ""),
    milestones: Array.isArray(q.milestones) ? q.milestones : [],
    show_pricing: q.show_pricing,
  };

  const { generateQuotationPdf } = await import("@/lib/quotationPdf");
  return generateQuotationPdf({
    quotation,
    items: itemsForClientPdf(data.items, !!q.hide_team_names),
    workspace: business,
    client,
    event,
    currency: q.currency || "INR",
    returnBlob,
  });
}
