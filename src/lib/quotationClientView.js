// What a client is allowed to see of a quotation, applied the same way on screen and in the PDF
// they download: hidden team names collapse to roles ("2× Lead Photographer"), "show pricing"
// off hides prices, and each section follows its "show in link" switch.

import { parseSnapshot } from "@/lib/quotationService";
import { INCLUDES_MARK } from "@/lib/quotationCalc";
import { getBusinessTerminology } from "@/lib/businessTerminology";

// The business's own wording (Event / Project / Appointment…, Venue / Site…) for client-facing pages and PDFs.
// Works from the business snapshot saved on the document; older snapshots only have business_type, so the
// quotation's own category fills in when the snapshot has no category.
export function termForBusiness(business, quotationCategory) {
  const b = business || {};
  const category = b.business_category || (quotationCategory && quotationCategory !== "OTHER" ? quotationCategory : "");
  return getBusinessTerminology({ ...b, business_category: category || undefined });
}

// Collapse team items to their role and service items to their name, merging identical rows
// into a "N × Label" count. (Same rows, same rate, same type merge; different rates stay apart.)
export function groupForHiddenNames(items) {
  const groups = [];
  const index = new Map();
  for (const it of items || []) {
    // Includes / Deliverables are listed as they are — "hide team names" never merges them.
    if ((it.item_type !== "team" && it.item_type !== "service") || it.phase_title === INCLUDES_MARK) {
      groups.push(it);
      continue;
    }
    const label = it.item_type === "team" ? (it.description || "Team Member") : (it.name || "Service");
    // The side (Bride Side / Groom Side…) is part of the identity, so each side keeps its own count.
    const side = it.item_type === "team" ? (it.member_type || "") : "";
    const key = `${it.item_type}:${it.day_date || ""}:${label}:${side}:${it.unit_rate}:${it.rate_type}`;
    if (index.has(key)) {
      const g = groups[index.get(key)];
      g._count = (g._count || 1) + 1;
      g.quantity = (Number(g.quantity) || 0) + (Number(it.quantity) || 0);
      g.line_total = (Number(g.line_total) || 0) + (Number(it.line_total) || 0);
    } else {
      index.set(key, groups.length);
      groups.push({ ...it, _count: 1, _label: label, _side: side });
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
      name: `${count} × ${it._label}${it._side ? ` (${it._side})` : ""}`,
      description: "",
      team_member_name_snapshot: "",
      _grouped: true,
    };
  });
}

// PDF rows for team members show the ROLE (e.g. "Lead Photographer"), never the person's name.
// Names already collapsed by "Hide team names" (_grouped) are left as they are.
export function teamRolesForPdf(items) {
  return (items || []).map((it) => {
    if (it.item_type !== "team" || it._grouped || !it.description) return it;
    return { ...it, name: `${it.description}${it.member_type ? ` (${it.member_type})` : ""}`, description: "", team_member_name_snapshot: "" };
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
