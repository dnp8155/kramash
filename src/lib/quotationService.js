// Quotation service: workspace-scoped queries, unique numbering,
// snapshot capture, CRUD for quotations + items, and package management.

import { base44 } from "@/api/base44Client";
import { round2, lineTotal, computeTotals, datesInRange, overrideOrNull } from "@/lib/quotationCalc";
import { syncQuotationAcceptance } from "@/lib/clientEdgeFunctions";

// ---- Public token generation ----

// Generate a 48-character hex token using Web Crypto API.
// Used for public quotation/portal URLs (URL 1 & URL 2).
export function generatePublicToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Services ----

export async function loadServices(workspaceId, { includeInactive = false } = {}) {
  if (!workspaceId) return [];
  const list = await base44.entities.Service.filter(
    { workspace_id: workspaceId }, "name", 200
  );
  let res = list || [];
  if (!includeInactive) res = res.filter((s) => s.status === "active");
  return res;
}

export async function loadAllServices(workspaceId) {
  return loadServices(workspaceId, { includeInactive: true });
}

// ---- Team Members + Roles ----

export async function loadTeamMembers(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500);
  return list || [];
}

export async function loadRoles(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 200);
  return list || [];
}

// ---- Quotation numbering ----

export async function generateQuotationNumber(workspaceId) {
  if (!workspaceId) return "";
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const list = await base44.entities.Quotation.filter(
    { workspace_id: workspaceId }, "-quotation_number", 500
  );
  let max = 0;
  for (const q of list || []) {
    const num = String(q.quotation_number || "");
    if (num.startsWith(prefix)) {
      const n = parseInt(num.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

// ---- Snapshots ----

export function buildClientSnapshot(client) {
  if (!client) return "";
  return JSON.stringify({
    name: client.name || "",
    phone: client.phone || "",
    email: client.email || "",
    address: client.address || "",
    city: client.city || "",
    state: client.state || "",
    country: client.country || "",
    gstin: client.gstin || ""
  });
}

export function buildBusinessSnapshot(workspace) {
  if (!workspace) return "";
  return JSON.stringify({
    name: workspace.name || "",
    logo: workspace.logo || "",
    tagline: workspace.tagline || "",
    website: workspace.website || "",
    business_type: workspace.business_type || "",
    address: workspace.address || "",
    city: workspace.city || "",
    state: workspace.state || "",
    country: workspace.country || "",
    phone: workspace.phone || "",
    email: workspace.email || "",
    gst_enabled: !!workspace.gst_enabled,
    gstin: workspace.gstin || "",
    gst_business_name: workspace.gst_business_name || "",
    gst_billing_address: workspace.gst_billing_address || "",
    gst_state: workspace.gst_state || "",
    default_gst_rate: workspace.default_gst_rate ?? 0,
    date_format: workspace.date_format || "",
    number_format: workspace.number_format || ""
  });
}

export function buildEventSnapshot(event) {
  if (!event) return "";
  return JSON.stringify({
    title: event.title || "",
    event_type: event.event_type || "",
    start_date: event.start_date || "",
    end_date: event.end_date || "",
    event_dates: Array.isArray(event.event_dates) ? event.event_dates : [],
    venue: event.venue || "",
    venue_address: event.venue_address || ""
  });
}

// Build a bank details snapshot from workspace display_preferences or explicit data.
export function buildBankDetailsSnapshot(bankData) {
  if (!bankData) return "";
  return JSON.stringify({
    account_name: bankData.account_name || "",
    bank_name: bankData.bank_name || "",
    account_number: bankData.account_number || "",
    ifsc: bankData.ifsc || "",
    upi_id: bankData.upi_id || ""
  });
}

export function buildSocialLinksSnapshot(socialData) {
  if (!socialData) return "";
  return JSON.stringify({
    instagram: socialData.instagram || "",
    youtube: socialData.youtube || "",
    website: socialData.website || "",
    twitter: socialData.twitter || socialData.portfolio || "",
    extra: Array.isArray(socialData.extra) ? socialData.extra.slice(0, 2) : []
  });
}

export function parseSnapshot(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// ---- Item payload helpers ----

export function toItemPayload(item, workspaceId, quotationId, sortOrder) {
  return {
    workspace_id: workspaceId,
    quotation_id: quotationId,
    item_type: item.item_type || "custom",
    reference_id: item.reference_id || "",
    team_member_id: item.team_member_id || null,
    team_member_name_snapshot: item.team_member_name_snapshot || "",
    member_type: item.member_type || "",
    day_date: item.day_date || null,
    phase_title: item.phase_title || "",
    is_addon: !!item.is_addon,
    name: item.name || "",
    description: item.description || "",
    quantity: Math.max(0, Number(item.quantity) || 0),
    days: Math.max(0, Number(item.days) || 0) || 1,
    unit_rate: round2(Math.max(0, Number(item.unit_rate) || 0)),
    rate_type: item.rate_type || "Fixed",
    line_total: lineTotal(item),
    gst_rate: Math.max(0, Number(item.gst_rate) || 0),
    sac_code: item.sac_code || "",
    sort_order: sortOrder ?? 0
  };
}

// ---- Totals payload ----

export function totalsPayload(items, opts) {
  const t = computeTotals(items, opts);
  return {
    subtotal: t.subtotal,
    discount_amount: t.discountAmount,
    adjustment_amount: t.adjustmentAmount,
    taxable_amount: t.taxableAmount,
    cgst_amount: t.cgstAmount,
    sgst_amount: t.sgstAmount,
    igst_amount: t.igstAmount,
    gst_total: t.gstTotal,
    grand_total: t.grandTotal
  };
}

// ---- Day grouping helpers ----

// Group items by day_date. Returns a map: { "2026-02-20": [...items], "uncategorized": [...items] }
export function groupItemsByDay(items) {
  const groups = {};
  for (const it of items || []) {
    const key = it.day_date || "uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  }
  return groups;
}

// Get sorted list of day dates that have items.
export function getDayDates(items) {
  const dates = new Set();
  for (const it of items || []) {
    if (it.day_date) dates.add(it.day_date);
  }
  return Array.from(dates).sort();
}

// Duplicate all items from a source day to target date(s).
// Returns new item objects (without ids) with day_date set to each target.
export function duplicateDayItems(items, sourceDate, targetDates) {
  const sourceItems = (items || []).filter((it) => it.day_date === sourceDate);
  const newItems = [];
  for (const targetDate of targetDates) {
    for (const it of sourceItems) {
      newItems.push({
        ...it,
        id: undefined,
        day_date: targetDate
        // phase_title, team_member_id, member_type, name, unit_rate, quantity all preserved
      });
    }
  }
  return newItems;
}

// ---- Queries ----

export async function loadQuotations(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.Quotation.filter(
    { workspace_id: workspaceId }, "-quotation_date", 500
  );
  return list || [];
}

export async function loadQuotationItems(workspaceId, quotationId) {
  if (!workspaceId || !quotationId) return [];
  const list = await base44.entities.QuotationItem.filter(
    { workspace_id: workspaceId, quotation_id: quotationId }, "sort_order", 500
  );
  return list || [];
}

export async function loadQuotation(workspaceId, quotationId) {
  if (!workspaceId || !quotationId) return null;
  try {
    const q = await base44.entities.Quotation.get(quotationId);
    if (!q || q.workspace_id !== workspaceId) return null;
    const items = await loadQuotationItems(workspaceId, quotationId);
    return { quotation: q, items };
  } catch (e) {
    return null;
  }
}

// ---- Create / Update ----

export async function createQuotation(workspaceId, data, items, opts = {}) {
  const totals = totalsPayload(items, {
    discountType: data.discount_type,
    discountValue: data.discount_value,
    gstApplicable: data.gst_applicable,
    gstMode: data.gst_mode,
    finalTotal: data.final_total_override
  });
  const quotation_number = data.quotation_number || (await generateQuotationNumber(workspaceId));
  const payload = {
    workspace_id: workspaceId,
    quotation_number,
    client_id: data.client_id || null,
    event_id: data.event_id || null,
    quotation_date: data.quotation_date || null,
    valid_until: data.valid_until || null,
    status: data.status || "draft",
    category: data.category || "OTHER",
    context_type: data.context_type || "",
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    excluded_dates: data.excluded_dates || [],
    show_pricing: data.show_pricing !== false,
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    final_total_override: overrideOrNull(data.final_total_override),
    gst_applicable: !!data.gst_applicable,
    gst_mode: data.gst_mode || "cgst_sgst",
    terms_and_conditions: data.terms_and_conditions || "",
    special_notes: data.special_notes || "",
    payment_conditions: data.payment_conditions || "",
    notes: data.notes || "",
    payment_schedule_json: data.payment_schedule_json || "",
    bank_details_snapshot: opts.bank_details_snapshot || "",
    social_links_snapshot: opts.social_links_snapshot || "",
    footer_message: data.footer_message || "",
    template_id: data.template_id || "gold_premium",
    template_config: data.template_config || "",
    project_title: data.project_title || "",
    project_summary: data.project_summary || "",
    client_snapshot: opts.client_snapshot || "",
    business_snapshot: opts.business_snapshot || "",
    event_snapshot: opts.event_snapshot || "",
    public_token: data.public_token || ""
  };
  const q = await base44.entities.Quotation.create(payload);
  const itemPayloads = (items || []).map((it, i) => toItemPayload(it, workspaceId, q.id, i));
  if (itemPayloads.length) await base44.entities.QuotationItem.bulkCreate(itemPayloads);
  return q;
}

export async function updateQuotation(workspaceId, quotationId, data, items, opts = {}) {
  const totals = totalsPayload(items, {
    discountType: data.discount_type,
    discountValue: data.discount_value,
    gstApplicable: data.gst_applicable,
    gstMode: data.gst_mode,
    finalTotal: data.final_total_override
  });
  const payload = {
    client_id: data.client_id || null,
    event_id: data.event_id || null,
    quotation_date: data.quotation_date || null,
    valid_until: data.valid_until || null,
    status: data.status || "draft",
    category: data.category || "OTHER",
    context_type: data.context_type || "",
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    excluded_dates: data.excluded_dates || [],
    show_pricing: data.show_pricing !== false,
    ...totals,
    discount_type: data.discount_type || "percent",
    discount_value: Math.max(0, Number(data.discount_value) || 0),
    final_total_override: overrideOrNull(data.final_total_override),
    gst_applicable: !!data.gst_applicable,
    gst_mode: data.gst_mode || "cgst_sgst",
    terms_and_conditions: data.terms_and_conditions || "",
    special_notes: data.special_notes || "",
    payment_conditions: data.payment_conditions || "",
    notes: data.notes || "",
    payment_schedule_json: data.payment_schedule_json || "",
    footer_message: data.footer_message || "",
    template_id: data.template_id || "gold_premium",
    template_config: data.template_config || "",
    project_title: data.project_title || "",
    project_summary: data.project_summary || ""
  };
  if (opts.client_snapshot !== undefined) payload.client_snapshot = opts.client_snapshot;
  if (opts.business_snapshot !== undefined) payload.business_snapshot = opts.business_snapshot;
  if (opts.event_snapshot !== undefined) payload.event_snapshot = opts.event_snapshot;
  if (opts.bank_details_snapshot !== undefined) payload.bank_details_snapshot = opts.bank_details_snapshot;
  if (opts.social_links_snapshot !== undefined) payload.social_links_snapshot = opts.social_links_snapshot;
  if (data.public_token) payload.public_token = data.public_token;

  const q = await base44.entities.Quotation.update(quotationId, payload);

  const existing = await loadQuotationItems(workspaceId, quotationId);
  if (existing.length) {
    await base44.entities.QuotationItem.deleteMany({ quotation_id: quotationId, workspace_id: workspaceId });
  }
  const itemPayloads = (items || []).map((it, i) => toItemPayload(it, workspaceId, quotationId, i));
  if (itemPayloads.length) await base44.entities.QuotationItem.bulkCreate(itemPayloads);
  return q;
}

// ---- Duplicate ----

export async function duplicateQuotation(workspaceId, sourceQuotation, sourceItems) {
  const newNumber = await generateQuotationNumber(workspaceId);
  const data = {
    quotation_number: newNumber,
    client_id: sourceQuotation.client_id || null,
    event_id: sourceQuotation.event_id || null,
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_until: sourceQuotation.valid_until || null,
    status: "draft",
    category: sourceQuotation.category || "OTHER",
    context_type: sourceQuotation.context_type || "",
    start_date: sourceQuotation.start_date || null,
    end_date: sourceQuotation.end_date || null,
    excluded_dates: sourceQuotation.excluded_dates || [],
    show_pricing: sourceQuotation.show_pricing !== false,
    discount_type: sourceQuotation.discount_type || "percent",
    discount_value: sourceQuotation.discount_value || 0,
    final_total_override: sourceQuotation.final_total_override ?? null,
    gst_applicable: !!sourceQuotation.gst_applicable,
    gst_mode: sourceQuotation.gst_mode || "cgst_sgst",
    terms_and_conditions: sourceQuotation.terms_and_conditions || "",
    special_notes: sourceQuotation.special_notes || "",
    payment_conditions: sourceQuotation.payment_conditions || "",
    notes: sourceQuotation.notes || "",
    payment_schedule_json: sourceQuotation.payment_schedule_json || "",
    footer_message: sourceQuotation.footer_message || "",
    template_id: sourceQuotation.template_id || "gold_premium",
    template_config: sourceQuotation.template_config || "",
    project_title: sourceQuotation.project_title || "",
    project_summary: sourceQuotation.project_summary || ""
  };
  const items = (sourceItems || []).map((it) => ({
    item_type: it.item_type,
    reference_id: it.reference_id,
    team_member_id: it.team_member_id,
    team_member_name_snapshot: it.team_member_name_snapshot,
    member_type: it.member_type,
    day_date: it.day_date,
    phase_title: it.phase_title,
    is_addon: it.is_addon,
    name: it.name,
    description: it.description,
    quantity: it.quantity,
    days: it.days,
    unit_rate: it.unit_rate,
    rate_type: it.rate_type,
    gst_rate: it.gst_rate,
    sac_code: it.sac_code
  }));
  return createQuotation(workspaceId, data, items, {
    bank_details_snapshot: sourceQuotation.bank_details_snapshot || "",
    social_links_snapshot: sourceQuotation.social_links_snapshot || ""
  });
}

// ---- Status transitions ----

export async function finalizeQuotation(workspaceId, quotationId, data, items, snapshots) {
  return updateQuotation(workspaceId, quotationId, { ...data, status: "finalized" }, items, {
    client_snapshot: snapshots.client_snapshot,
    business_snapshot: snapshots.business_snapshot,
    event_snapshot: snapshots.event_snapshot,
    bank_details_snapshot: snapshots.bank_details_snapshot,
    social_links_snapshot: snapshots.social_links_snapshot
  });
}

export async function acceptQuotation(workspaceId, quotationId, { updateContractValue = true, sync = true } = {}) {
  const q = await base44.entities.Quotation.update(quotationId, {
    status: "accepted",
    sync_pending: sync
  });
  let eventUpdated = false;
  let previousContractValue = null;
  if (updateContractValue && q.event_id) {
    try {
      const ev = await base44.entities.Event.get(q.event_id);
      if (ev && ev.workspace_id === workspaceId) {
        previousContractValue = Number(ev.contract_value) || 0;
        await base44.entities.Event.update(ev.id, { contract_value: q.grand_total });
        eventUpdated = true;
      }
    } catch (e) { /* non-fatal */ }
  }
  // Trigger the full Event + Team + Service + Milestone sync
  let syncResult = null;
  if (sync) {
    try {
      syncResult = await syncQuotationAcceptance(workspaceId, quotationId);
    } catch (e) { /* non-fatal — admin can retry sync from UI */ }
  }
  return { quotation: q, eventUpdated, previousContractValue, syncResult };
}

export async function setStatus(workspaceId, quotationId, status) {
  return base44.entities.Quotation.update(quotationId, { status });
}

export async function deleteQuotation(workspaceId, quotationId) {
  await base44.entities.QuotationItem.deleteMany({ quotation_id: quotationId, workspace_id: workspaceId });
  return base44.entities.Quotation.delete(quotationId);
}

// ---- Relationship security ----

export async function verifyQuotationRefs(workspaceId, clientId, eventId) {
  if (!workspaceId) return { ok: false, error: "No active workspace." };
  let client = null;
  let event = null;
  if (clientId) {
    try {
      client = await base44.entities.Client.get(clientId);
      if (!client || client.workspace_id !== workspaceId) {
        return { ok: false, error: "Selected client does not belong to your workspace." };
      }
    } catch (e) {
      return { ok: false, error: "Selected client could not be found." };
    }
  }
  if (eventId) {
    try {
      event = await base44.entities.Event.get(eventId);
      if (!event || event.workspace_id !== workspaceId) {
        return { ok: false, error: "Selected event does not belong to your workspace." };
      }
      if (clientId && event.client_id !== clientId) {
        return { ok: false, error: "Selected event does not belong to the selected client." };
      }
    } catch (e) {
      return { ok: false, error: "Selected event could not be found." };
    }
  }
  return { ok: true, client, event };
}

// ---- Package Management ----

export async function loadPackages(workspaceId) {
  if (!workspaceId) return [];
  const list = await base44.entities.QuotationPackage.filter(
    { workspace_id: workspaceId }, "name", 200
  );
  return list || [];
}

export async function createPackage(workspaceId, data) {
  return base44.entities.QuotationPackage.create({
    workspace_id: workspaceId,
    name: data.name || "",
    description: data.description || "",
    category: data.category || "OTHER",
    structure_json: data.structure_json || "",
    terms_and_conditions: data.terms_and_conditions || "",
    footer_message: data.footer_message || "",
    status: "active"
  });
}

export async function updatePackage(workspaceId, packageId, data) {
  return base44.entities.QuotationPackage.update(packageId, {
    name: data.name,
    description: data.description,
    category: data.category,
    structure_json: data.structure_json,
    terms_and_conditions: data.terms_and_conditions,
    footer_message: data.footer_message,
    status: data.status || "active"
  });
}

export async function deletePackage(workspaceId, packageId) {
  return base44.entities.QuotationPackage.delete(packageId);
}

// One-time repair for packages saved before team items were generalized to
// roles: converts any leftover item_type "team" entries (specific person name)
// into a generic "role" slot, matching what serializePackageStructure now does
// at save time. Returns { changed: false } when there's nothing to repair.
export function migrateLegacyPackageStructure(structureJson) {
  let days = [];
  try {
    days = JSON.parse(structureJson || "[]");
  } catch {
    return { changed: false, structureJson };
  }
  let changed = false;
  const next = days.map((d) => ({
    ...d,
    items: (d.items || []).map((it) => {
      if (it.item_type !== "team") return it;
      changed = true;
      return {
        item_type: "role",
        reference_id: "",
        team_member_id: null,
        team_member_name_snapshot: "",
        member_type: it.member_type || "",
        name: it.description || it.name || "Role",
        description: "",
        quantity: it.quantity,
        days: it.days,
        unit_rate: it.unit_rate,
        rate_type: it.rate_type,
        gst_rate: it.gst_rate,
        sac_code: it.sac_code,
        is_addon: it.is_addon
      };
    })
  }));
  if (!changed) return { changed: false, structureJson };
  return { changed: true, structureJson: JSON.stringify(next) };
}

// Serialize current quotation days/items into a package structure JSON.
// structure: [{ day_date, phase_title, items: [...] }]
// Team items are generalized to a "role" slot (role name + rate only) — a package
// is a reusable template and must not pin a specific team member's name to it.
export function serializePackageStructure(items, roles = []) {
  const days = {};
  for (const it of items || []) {
    const key = it.day_date || "uncategorized";
    if (!days[key]) days[key] = { day_date: key, phase_title: it.phase_title || "", items: [] };
    const isTeam = it.item_type === "team";
    const role = isTeam ? roles.find((r) => r.name === it.description) : null;
    days[key].items.push({
      item_type: isTeam ? "role" : it.item_type,
      reference_id: isTeam ? (role?.id || "") : it.reference_id,
      team_member_id: null,
      team_member_name_snapshot: "",
      member_type: it.member_type,
      name: isTeam ? (it.description || "Role") : it.name,
      description: isTeam ? "" : it.description,
      quantity: it.quantity,
      days: it.days,
      unit_rate: it.unit_rate,
      rate_type: it.rate_type,
      gst_rate: it.gst_rate,
      sac_code: it.sac_code,
      is_addon: it.is_addon
    });
  }
  return JSON.stringify(Object.values(days));
}

// Deserialize a package structure JSON into items array.
// Items get new day_dates mapped to the quotation's included dates.
export function deserializePackageStructure(structureJson, includedDateList) {
  let days = [];
  try {
    days = JSON.parse(structureJson || "[]");
  } catch (e) {
    return [];
  }
  const items = [];
  days.forEach((day, idx) => {
    const packageDate = day.day_date && day.day_date !== "uncategorized" ? day.day_date : "";
    const targetDate = includedDateList[idx] || packageDate;
    for (const it of (day.items || [])) {
      items.push({
        ...it,
        id: undefined,
        day_date: targetDate,
        phase_title: day.phase_title || ""
      });
    }
  });
  return items;
}

// ---- Default services seeding ----

export async function ensureDefaultServices(workspaceId) {
  if (!workspaceId) return 0;
  const existing = await base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 50);
  if (existing && existing.length > 0) return 0;
  const { getIndustryPresets } = await import("@/constants/industryPresets");
  let category = "OTHER";
  try { category = (await base44.entities.Workspace.get(workspaceId))?.business_category || "OTHER"; } catch { /* fall back to no presets */ }
  const services = getIndustryPresets(category).services;
  if (!services || services.length === 0) return 0;
  const created = await base44.entities.Service.bulkCreate(
    services.map((s) => ({ ...s, workspace_id: workspaceId, status: "active" }))
  );
  return Array.isArray(created) ? created.length : 0;
}
// ---- Event → quotation prefill ----

// Split `total` evenly over `n` parts; rounding leftovers go on the last part so the parts add up exactly.
function splitEvenly(total, n) {
  if (n <= 1) return [round2(total)];
  const base = Math.floor((total / n) * 100) / 100;
  const parts = Array(n).fill(base);
  parts[n - 1] = round2(total - base * (n - 1));
  return parts;
}

// Build a day-wise quotation structure from an event's team, services, add-ons and misc expenses.
// Team rates are spread across each member's working dates and services across the event days;
// add-ons sit on the first event day; billable misc expenses ("financials") are custom items on the first day.
export async function buildQuotationFromEvent(workspaceId, event) {
  const eventDates = (Array.isArray(event.event_dates) && event.event_dates.length
    ? [...event.event_dates]
    : datesInRange(event.start_date, event.end_date || event.start_date)
  ).filter(Boolean).sort();
  const startDate = eventDates[0] || event.start_date || "";
  const endDate = eventDates[eventDates.length - 1] || event.end_date || startDate;
  const rangeDates = datesInRange(startDate, endDate);
  const eventDateSet = new Set(eventDates);
  // Gaps between non-consecutive event dates are excluded so they don't show up as empty days.
  const excludedDates = eventDates.length ? rangeDates.filter((d) => !eventDateSet.has(d)) : [];
  const firstDay = eventDates[0] || startDate || null;

  const [teamAsgns, serviceAsgns, members, services] = await Promise.all([
    base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id, assignment_status: "assigned" }, "created_date", 500),
    base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, event_id: event.id, assignment_status: "assigned" }, "created_date", 500),
    base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
    base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500)
  ]);
  const membersMap = Object.fromEntries((members || []).map((m) => [m.id, m]));
  const servicesMap = Object.fromEntries((services || []).map((s) => [s.id, s]));

  const items = [];
  (teamAsgns || []).forEach((a) => {
    const m = membersMap[a.team_member_id];
    const rate = Number(a.agreed_rate) || 0;
    const booked = a.booking_start_date ? datesInRange(a.booking_start_date, a.booking_end_date || a.booking_start_date) : [];
    const wd = (Array.isArray(a.working_dates) && a.working_dates.length ? [...a.working_dates] : booked.length ? booked : eventDates).filter(Boolean).sort();
    const dates = wd.length ? wd : [firstDay];
    const perDay = a.rate_type === "Per Day";
    const amounts = perDay ? dates.map(() => rate) : splitEvenly(rate, dates.length);
    dates.forEach((d, i) => {
      items.push({
        item_type: "team", reference_id: a.team_member_id, team_member_id: a.team_member_id,
        team_member_name_snapshot: m?.name || "", member_type: a.member_type_snapshot || "",
        day_date: d || null,
        name: m?.name || "Team Member",
        description: a.role_name_snapshot || m?.profession || "",
        quantity: 1, days: 1, unit_rate: amounts[i],
        rate_type: perDay ? "Per Day" : "Fixed", gst_rate: 0, sac_code: ""
      });
    });
  });
  // Services aren't dated per assignment; like the calendar, they run on every event day.
  // Add-ons are one-off extras, so they sit on the first day.
  (serviceAsgns || []).forEach((a) => {
    const svc = servicesMap[a.service_id];
    const rate = Number(a.agreed_rate) || 0;
    const isAddon = !!a.is_addon;
    const dates = !isAddon && eventDates.length ? eventDates : [firstDay];
    const perDay = a.rate_type === "Per Day";
    const amounts = perDay ? dates.map(() => rate) : splitEvenly(rate, dates.length);
    dates.forEach((d, i) => {
      items.push({
        item_type: "service", reference_id: a.service_id, day_date: d || null,
        name: a.service_name_snapshot || svc?.name || "Service",
        description: a.provider_name_snapshot ? `Provider: ${a.provider_name_snapshot}` : (svc?.description || ""),
        quantity: 1, days: 1, unit_rate: amounts[i], rate_type: perDay ? "Per Day" : "Fixed",
        gst_rate: Number(svc?.gst_rate) || 0, sac_code: svc?.sac_code || "", is_addon: isAddon
      });
    });
  });
  try {
    const misc = JSON.parse(event.misc_expenses_json || "[]");
    (Array.isArray(misc) ? misc : []).forEach((m) => {
      items.push({
        item_type: "custom", day_date: firstDay, name: m.name || "Misc Expense", description: m.notes || "",
        quantity: 1, days: 1, unit_rate: Number(m.amount) || 0, rate_type: "Fixed", gst_rate: 0, sac_code: ""
      });
    });
  } catch { /* ignore parse errors */ }

  return {
    items, startDate, endDate, excludedDates,
    counts: {
      team: (teamAsgns || []).length,
      services: (serviceAsgns || []).filter((a) => !a.is_addon).length,
      addons: (serviceAsgns || []).filter((a) => a.is_addon).length,
      misc: items.filter((i) => i.item_type === "custom").length
    }
  };
}
