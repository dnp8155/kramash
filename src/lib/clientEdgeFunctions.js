// Client-side replacements for Edge Functions that are not deployed on Supabase.
// All logic that previously ran server-side is implemented here using direct
// Supabase entity operations via the base44 compatibility layer.

import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { round2 } from "@/lib/quotationCalc";
import { deriveInvoiceStatus } from "@/lib/invoiceService";

// ---- Helpers ----

function generateSecureToken(byteLength = 24) {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => chars[b % chars.length]).join("");
}

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const salt = generateSecureToken(16);
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(salt + ":" + password));
  return `${salt}:${bytesToHex(digest)}`;
}

function computeMilestoneStatus(paid, due, dueDate) {
  if (due <= 0) return "upcoming";
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate && dueDate < today) return "overdue";
  if (dueDate && dueDate <= today) return "due";
  return "upcoming";
}

// Reconcile invoice from ACTIVE CLIENT_RECEIPT transactions
async function reconcileInvoice(workspaceId, invoiceId) {
  if (!workspaceId || !invoiceId) return null;
  const inv = await base44.entities.Invoice.get(invoiceId);
  if (!inv || inv.workspace_id !== workspaceId) return null;
  const txns = await base44.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, invoice_id: invoiceId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
    "-transaction_date", 200
  );
  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const grandTotal = Number(inv.grand_total) || 0;
  const balance = round2(Math.max(0, grandTotal - paid));
  const status = deriveInvoiceStatus({ ...inv, amount_paid: paid });
  return base44.entities.Invoice.update(invoiceId, { amount_paid: paid, balance_due: balance, status });
}

// Reconcile milestone from ACTIVE CLIENT_RECEIPT transactions
async function reconcileMilestone(workspaceId, milestoneId) {
  if (!workspaceId || !milestoneId) return null;
  const m = await base44.entities.PaymentMilestone.get(milestoneId);
  if (!m || m.workspace_id !== workspaceId) return null;
  const txns = await base44.entities.FinancialTransaction.filter(
    { workspace_id: workspaceId, milestone_id: milestoneId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
    "-transaction_date", 200
  );
  const paid = round2((txns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const due = Number(m.due_amount) || 0;
  const status = computeMilestoneStatus(paid, due, m.due_date || "");
  return base44.entities.PaymentMilestone.update(milestoneId, { paid_amount: paid, status });
}

async function reconcileAfterTransactionChange(workspaceId, invoiceId, milestoneId) {
  const results = {};
  if (invoiceId) { try { results.invoice = await reconcileInvoice(workspaceId, invoiceId); } catch { /* */ } }
  if (milestoneId) { try { results.milestone = await reconcileMilestone(workspaceId, milestoneId); } catch { /* */ } }
  return results;
}

// ---- Simple CRUD creates ----

// createTeamMember — direct create with auto-color + self enforcement
export async function createTeamMember(payload) {
  const { workspace_id, ...rest } = payload;
  // Enforce single Self per workspace
  if (rest.is_self) {
    const existing = await base44.entities.TeamMember.filter({ workspace_id }, "name", 500);
    if ((existing || []).some((m) => m.is_self === true)) {
      throw { data: { error: "Self is already assigned to another member in this workspace." } };
    }
  }
  // Auto-assign color if not provided
  if (!rest.color) {
    const palette = ["#0d9488","#6366f1","#ec4899","#f59e0b","#8b5cf6","#ef4444","#14b8a6","#f97316","#3b82f6","#84cc16","#a855f7","#06b6d4"];
    const existing = await base44.entities.TeamMember.filter({ workspace_id }, "name", 500);
    const usedColors = new Set((existing || []).map((m) => m.color).filter(Boolean));
    rest.color = palette.find((c) => !usedColors.has(c)) || palette[(existing?.length || 0) % palette.length];
  }
  return base44.entities.TeamMember.create({ ...rest, workspace_id });
}

// createEvent — direct create
export async function createEvent(payload) {
  return base44.entities.Event.create(payload);
}

// createLead — direct create
export async function createLead(payload) {
  return base44.entities.Lead.create(payload);
}

// createService — direct create
export async function createService(payload) {
  return base44.entities.Service.create(payload);
}

// createTeamAssignment — direct create + sync team_member_ids on event
export async function createTeamAssignment(payload) {
  const { workspace_id, event_id, team_member_id, ...rest } = payload;
  // Check for duplicate assignment
  const existing = await base44.entities.EventTeamAssignment.filter({
    workspace_id, event_id, team_member_id, assignment_status: "assigned"
  });
  if (existing && existing.length > 0) {
    throw { data: { error: "ALREADY_ASSIGNED", message: "This member is already assigned to this event." } };
  }
  // SELF guard — only one self per event
  const member = await base44.entities.TeamMember.get(team_member_id);
  if (member && member.is_self) {
    const selfAssignments = await base44.entities.EventTeamAssignment.filter({
      workspace_id, event_id, assignment_status: "assigned"
    });
    for (const a of (selfAssignments || [])) {
      const m = await base44.entities.TeamMember.get(a.team_member_id);
      if (m && m.is_self) {
        throw { data: { error: "SELF_ALREADY_ASSIGNED", message: "Owner / Self is already assigned to this event." } };
      }
    }
  }
  const saved = await base44.entities.EventTeamAssignment.create({
    ...rest, workspace_id, event_id, team_member_id, assignment_status: "assigned"
  });
  // Sync team_member_ids on the event
  try {
    const ev = await base44.entities.Event.get(event_id);
    if (ev) {
      const currentIds = Array.isArray(ev.team_member_ids) ? [...ev.team_member_ids] : [];
      if (!currentIds.includes(team_member_id)) {
        currentIds.push(team_member_id);
        await base44.entities.Event.update(event_id, { team_member_ids: currentIds });
      }
    }
  } catch { /* non-critical */ }
  return saved;
}

// ---- Payment operations ----

// recordPayment — team or service payment with SELF guard
export async function recordPayment(params) {
  const {
    kind, workspace_id, event_id,
    assignment_id, team_member_id, service_assignment_id,
    amount, payment_method, transaction_date,
    reference_number, notes, financial_year_id
  } = params;

  const amt = Number(amount);
  if (!amt || isNaN(amt) || amt <= 0) throw { data: { error: "Amount must be greater than zero." } };
  if (!financial_year_id) throw { data: { error: "financial_year_id required" } };

  const ev = await base44.entities.Event.get(event_id);
  if (!ev || ev.workspace_id !== workspace_id) throw { data: { error: "Event not found in this workspace." } };

  let payloadMemberId = "";
  let teamAssignmentId = "";
  let expenseCategoryName = "";
  let transactionType = "";

  if (kind === "team") {
    const a = await base44.entities.EventTeamAssignment.get(assignment_id);
    if (!a || a.workspace_id !== workspace_id || a.event_id !== event_id) {
      throw { data: { error: "Assignment not found for this event." } };
    }
    const member = await base44.entities.TeamMember.get(team_member_id);
    if (!member || member.workspace_id !== workspace_id) {
      throw { data: { error: "Team member not found in this workspace." } };
    }
    if (member.is_self) {
      throw { data: { error: "SELF_PAYMENT_BLOCKED", message: "The workspace owner cannot be paid as a team member." } };
    }
    payloadMemberId = team_member_id;
    teamAssignmentId = assignment_id;
    transactionType = "TEAM_PAYMENT";
  } else if (kind === "service") {
    const sa = await base44.entities.EventServiceAssignment.get(service_assignment_id);
    if (!sa || sa.workspace_id !== workspace_id || sa.event_id !== event_id) {
      throw { data: { error: "Service assignment not found for this event." } };
    }
    if (sa.provider_id) {
      const provider = await base44.entities.TeamMember.get(sa.provider_id);
      if (provider && provider.workspace_id === workspace_id && provider.is_self) {
        throw { data: { error: "SELF_PAYMENT_BLOCKED", message: "The workspace owner cannot be paid as a service provider." } };
      }
    }
    expenseCategoryName = `Service: ${sa.service_name_snapshot || ""}`;
    transactionType = "BUSINESS_EXPENSE";
  } else {
    throw { data: { error: "kind must be 'team' or 'service'." } };
  }

  return base44.entities.FinancialTransaction.create({
    workspace_id, financial_year_id, event_id,
    transaction_type: transactionType,
    team_member_id: payloadMemberId || undefined,
    team_assignment_id: teamAssignmentId || undefined,
    service_assignment_id: kind === "service" ? service_assignment_id : undefined,
    expense_category_name_snapshot: expenseCategoryName || undefined,
    amount: amt, payment_method: payment_method || "Cash",
    transaction_date, reference_number: (reference_number || "").trim(),
    notes: (notes || "").trim(), status: "ACTIVE"
  });
}

// recordInvoicePayment — create CLIENT_RECEIPT + update invoice + reconcile milestone
export async function recordInvoicePayment(params) {
  const { workspace_id, invoice_id, amount, payment_method, transaction_date,
    reference_number, notes, financial_year_id } = params;

  const amt = Number(amount);
  if (!amt || isNaN(amt) || amt <= 0) throw { data: { error: "Amount must be greater than zero." } };
  if (!financial_year_id) throw { data: { error: "financial_year_id required" } };

  const inv = await base44.entities.Invoice.get(invoice_id);
  if (!inv || inv.workspace_id !== workspace_id) throw { data: { error: "Invoice not found in this workspace." } };
  if (inv.status === "cancelled") throw { data: { error: "Cannot record payments on a cancelled invoice." } };
  if (inv.status === "draft") throw { data: { error: "Invoice must be issued before recording payments." } };

  // Duplicate prevention
  if (reference_number && String(reference_number).trim()) {
    const existing = await base44.entities.FinancialTransaction.filter(
      { workspace_id, invoice_id, reference_number: String(reference_number).trim(), status: "ACTIVE" },
      "-transaction_date", 5
    );
    if (existing && existing.length > 0) {
      throw { data: { error: "DUPLICATE_PAYMENT", message: "A payment with this reference number already exists." } };
    }
  }

  const existingTxns = await base44.entities.FinancialTransaction.filter(
    { workspace_id, invoice_id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
    "-transaction_date", 200
  );
  const currentPaid = round2((existingTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const grandTotal = Number(inv.grand_total) || 0;
  const newPaidAmount = round2(currentPaid + amt);

  if (newPaidAmount > grandTotal + 0.01) {
    throw { data: { error: "OVERPAYMENT_PREVENTED", message: `Payment would exceed invoice total. Current: ${currentPaid}, Total: ${grandTotal}` } };
  }

  const txn = await base44.entities.FinancialTransaction.create({
    workspace_id, financial_year_id,
    event_id: inv.event_id || undefined, invoice_id,
    client_id: inv.client_id || undefined, milestone_id: inv.milestone_id || undefined,
    transaction_type: "CLIENT_RECEIPT", amount: amt,
    payment_method: payment_method || "UPI", transaction_date,
    reference_number: (reference_number || "").trim(), notes: (notes || "").trim(),
    status: "ACTIVE"
  });

  const balanceDue = round2(Math.max(0, grandTotal - newPaidAmount));
  const newStatus = deriveInvoiceStatus({ grand_total: grandTotal, amount_paid: newPaidAmount, due_date: inv.due_date, status: inv.status });
  await base44.entities.Invoice.update(invoice_id, { amount_paid: newPaidAmount, balance_due: balanceDue, status: newStatus });

  if (inv.milestone_id) {
    try { await reconcileMilestone(workspace_id, inv.milestone_id); } catch { /* */ }
  }

  return { success: true, transaction_id: txn.id, invoice_id, amount_paid: newPaidAmount, balance_due: balanceDue, status: newStatus };
}

// voidTransaction — soft-delete + reconcile
export async function voidTransaction(workspaceId, transactionId) {
  const txn = await base44.entities.FinancialTransaction.get(transactionId);
  if (!txn || txn.workspace_id !== workspaceId) throw { data: { error: "Transaction not found." } };
  if (txn.status === "VOID") throw { data: { error: "Transaction is already voided." } };
  const invoiceId = txn.invoice_id || "";
  const milestoneId = txn.milestone_id || "";
  await base44.entities.FinancialTransaction.update(transactionId, { status: "VOID" });
  const reconciled = await reconcileAfterTransactionChange(workspaceId, invoiceId, milestoneId);
  return { success: true, transaction_id: transactionId, voided: true, ...reconciled };
}

// deleteTransaction — hard delete + reconcile
export async function deleteTransactionFn(workspaceId, transactionId) {
  const txn = await base44.entities.FinancialTransaction.get(transactionId);
  if (!txn || txn.workspace_id !== workspaceId) throw { data: { error: "Transaction not found." } };
  const invoiceId = txn.invoice_id || "";
  const milestoneId = txn.milestone_id || "";
  await base44.entities.FinancialTransaction.delete(transactionId);
  const reconciled = await reconcileAfterTransactionChange(workspaceId, invoiceId, milestoneId);
  return { success: true, transaction_id: transactionId, deleted: true, ...reconciled };
}

// editTransaction — update + reconcile
export async function editTransaction(workspaceId, transactionId, changes) {
  const txn = await base44.entities.FinancialTransaction.get(transactionId);
  if (!txn || txn.workspace_id !== workspaceId) throw { data: { error: "Transaction not found." } };
  const updates = {};
  if (changes.amount !== undefined) updates.amount = Number(changes.amount);
  if (changes.payment_method !== undefined) updates.payment_method = changes.payment_method;
  if (changes.transaction_date !== undefined) updates.transaction_date = changes.transaction_date;
  if (changes.reference_number !== undefined) updates.reference_number = changes.reference_number;
  if (changes.notes !== undefined) updates.notes = changes.notes;
  if (changes.financial_year_id !== undefined) updates.financial_year_id = changes.financial_year_id;
  await base44.entities.FinancialTransaction.update(transactionId, updates);
  const reconciled = await reconcileAfterTransactionChange(workspaceId, txn.invoice_id || "", txn.milestone_id || "");
  return { success: true, transaction_id: transactionId, ...reconciled };
}

// ---- Toggle operations ----

// togglePublicLink — update Quotation with token generation
export async function togglePublicLink(params) {
  const { quotation_id, enabled, hide_team_names, portal_password } = params;
  const q = await base44.entities.Quotation.get(quotation_id);
  if (!q) throw { data: { error: "Quotation not found" } };
  const updates = {};
  if (enabled !== undefined) {
    updates.public_link_enabled = !!enabled;
    if (enabled && !q.public_token) updates.public_token = generateSecureToken();
  }
  if (hide_team_names !== undefined) updates.hide_team_names = !!hide_team_names;
  if (portal_password !== undefined) updates.client_access_password = portal_password ? String(portal_password).trim() : "";
  const updated = await base44.entities.Quotation.update(quotation_id, updates);
  return {
    public_link_enabled: !!updated.public_link_enabled,
    public_token: updated.public_token || "",
    hide_team_names: !!updated.hide_team_names,
    client_access_password: updated.client_access_password || "",
    portal_view_count: Number(updated.portal_view_count) || 0,
    portal_first_viewed_at: updated.portal_first_viewed_at || "",
    portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
  };
}

// toggleInvoicePublicLink — update Invoice with token generation
export async function toggleInvoicePublicLinkFn(invoiceId, enabled) {
  const inv = await base44.entities.Invoice.get(invoiceId);
  if (!inv) throw { data: { error: "Invoice not found" } };
  const updates = {};
  if (enabled !== undefined) {
    updates.public_link_enabled = !!enabled;
    if (enabled && !inv.public_token) updates.public_token = generateSecureToken();
  }
  const updated = await base44.entities.Invoice.update(invoiceId, updates);
  return {
    public_link_enabled: !!updated.public_link_enabled,
    public_token: updated.public_token || "",
    portal_view_count: Number(updated.portal_view_count) || 0,
    portal_first_viewed_at: updated.portal_first_viewed_at || "",
    portal_latest_viewed_at: updated.portal_latest_viewed_at || ""
  };
}

// ---- Portal access (team member) ----

export async function enableTeamPortalAccess(params) {
  const { team_member_id, workspace_id, action } = params;
  const member = await base44.entities.TeamMember.get(team_member_id);
  if (!member || member.workspace_id !== workspace_id) throw { data: { error: "Team member not found" } };
  if (member.is_self) throw { data: { error: "Portal access is not available for the workspace owner" } };

  if (action === "disable") {
    await base44.entities.TeamMember.update(team_member_id, {
      portal_access_enabled: false, portal_password_hash: "", portal_access_token: ""
    });
    return { success: true, enabled: false };
  }

  const accessToken = generateSecureToken();
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  await base44.entities.TeamMember.update(team_member_id, {
    portal_access_token: accessToken, portal_password_hash: passwordHash, portal_access_enabled: true
  });
  return { success: true, enabled: true, password, login_url: `${window.location.origin}/team-login/${accessToken}`, access_token: accessToken };
}

export async function updateTeamPortalPassword(params) {
  const { team_member_id, workspace_id } = params;
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  await base44.entities.TeamMember.update(team_member_id, { portal_password_hash: passwordHash });
  return { password };
}

// ---- Quotation acceptance sync ----

export async function syncQuotationAcceptance(workspaceId, quotationId) {
  const quotation = await base44.entities.Quotation.get(quotationId);
  if (!quotation || quotation.workspace_id !== workspaceId) throw { data: { error: "Quotation not found" } };
  if (quotation.status !== "accepted") throw { data: { error: "Quotation must be accepted before syncing" } };

  const items = await base44.entities.QuotationItem.filter({ workspace_id: workspaceId, quotation_id: quotationId }, "sort_order", 500);

  let clientSnapshot = null, eventSnapshot = null;
  try { clientSnapshot = JSON.parse(quotation.client_snapshot || "{}"); } catch { /* */ }
  try { eventSnapshot = JSON.parse(quotation.event_snapshot || "{}"); } catch { /* */ }

  // 1. Create or update event
  let event = null;
  if (quotation.event_id) {
    try { event = await base44.entities.Event.get(quotation.event_id); if (!event || event.workspace_id !== workspaceId) event = null; } catch { /* */ }
  }
  const eventDates = quotation.event_dates || (quotation.start_date ? [quotation.start_date] : []);
  const eventPayload = {
    client_id: quotation.client_id || "",
    title: clientSnapshot?.name ? `${clientSnapshot.name} — ${quotation.project_title || quotation.quotation_number}` : (quotation.project_title || quotation.quotation_number),
    event_type: eventSnapshot?.event_type || "",
    start_date: quotation.start_date || quotation.quotation_date,
    end_date: quotation.end_date || quotation.start_date || quotation.quotation_date,
    event_dates: eventDates,
    venue: eventSnapshot?.venue || "", venue_address: eventSnapshot?.venue_address || "",
    contract_value: Number(quotation.grand_total) || 0,
    status: "upcoming", description: quotation.project_summary || "",
    notes: `Auto-synced from quotation ${quotation.quotation_number}`
  };
  if (event) {
    const updateData = { ...eventPayload };
    if (event.status === "in-progress" || event.status === "completed") delete updateData.status;
    event = await base44.entities.Event.update(event.id, updateData);
  } else {
    event = await base44.entities.Event.create({ workspace_id: workspaceId, ...eventPayload });
  }

  // 2. Sync team assignments
  const teamItems = (items || []).filter((it) => it.item_type === "team" && it.team_member_id);
  const teamByMember = {};
  for (const it of teamItems) { (teamByMember[it.team_member_id] = teamByMember[it.team_member_id] || []).push(it); }
  for (const [memberId, memberItems] of Object.entries(teamByMember)) {
    const first = memberItems[0];
    const agreedRate = memberItems.reduce((s, it) => s + (Number(it.line_total) || 0), 0);
    const workingDates = [...new Set(memberItems.map((it) => it.day_date).filter(Boolean))].sort();
    const existing = await base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id, team_member_id: memberId, assignment_status: "assigned" });
    const data = {
      role_id: first.reference_id || "", member_type_snapshot: first.member_type || "",
      agreed_rate: agreedRate, rate_type: first.rate_type || "Per Event",
      working_dates: workingDates, booking_start_date: workingDates[0] || "", booking_end_date: workingDates[workingDates.length - 1] || "",
      notes: `Synced from quotation ${quotation.quotation_number}`
    };
    if (existing && existing.length > 0) await base44.entities.EventTeamAssignment.update(existing[0].id, data);
    else await base44.entities.EventTeamAssignment.create({ workspace_id: workspaceId, event_id: event.id, team_member_id: memberId, assignment_status: "assigned", ...data });
  }
  await base44.entities.Event.update(event.id, { team_member_ids: Object.keys(teamByMember) });

  // 3. Sync service assignments
  const serviceItems = (items || []).filter((it) => it.item_type === "service" && it.reference_id);
  const serviceByRef = {};
  for (const it of serviceItems) { (serviceByRef[it.reference_id] = serviceByRef[it.reference_id] || []).push(it); }
  for (const [serviceId, svcItems] of Object.entries(serviceByRef)) {
    const first = svcItems[0];
    const agreedRate = svcItems.reduce((s, it) => s + (Number(it.line_total) || 0), 0);
    const isAddon = svcItems.some((it) => it.is_addon);
    const existing = await base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, event_id: event.id, service_id: serviceId, assignment_status: "assigned" });
    const data = { service_name_snapshot: first.name || "", agreed_rate: agreedRate, rate_type: first.rate_type || "Fixed", is_addon: isAddon, notes: `Synced from quotation ${quotation.quotation_number}` };
    if (existing && existing.length > 0) await base44.entities.EventServiceAssignment.update(existing[0].id, data);
    else await base44.entities.EventServiceAssignment.create({ workspace_id: workspaceId, event_id: event.id, service_id: serviceId, assignment_status: "assigned", ...data });
  }
  await base44.entities.Event.update(event.id, { service_ids: Object.keys(serviceByRef) });

  // 4. Sync milestones
  let milestones = [];
  try { milestones = JSON.parse(quotation.payment_schedule_json || "[]"); } catch { /* */ }
  const grandTotal = Number(quotation.grand_total) || 0;
  const existingMilestones = await base44.entities.PaymentMilestone.filter({ workspace_id: workspaceId, quotation_id: quotationId }, "sort_order", 100);
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    if (!m.name || !m.name.trim()) continue;
    const value = Math.max(0, Number(m.value) || 0);
    const dueAmount = m.type === "fixed" ? round2(value) : round2((grandTotal * value) / 100);
    let calculatedDueDate = m.due_date || "";
    if (m.due_date_type === "on_signing") calculatedDueDate = quotation.quotation_date || "";
    else if (m.due_date_type === "event_day") calculatedDueDate = event.start_date || "";
    else if (m.due_date_type === "day_after_event") {
      const endDate = event.end_date || event.start_date || "";
      if (endDate) { const d = new Date(endDate + "T00:00:00"); d.setDate(d.getDate() + 1); calculatedDueDate = d.toISOString().slice(0, 10); }
    }
    const existing = (existingMilestones || []).find((em) => em.name === m.name);
    const data = { event_id: event.id, client_id: quotation.client_id || "", name: m.name.trim(), description: m.due_condition || "", sort_order: i, milestone_type: m.type || "percent", milestone_value: value, due_amount: dueAmount, due_condition: m.due_condition || "", due_date: calculatedDueDate };
    if (existing) await base44.entities.PaymentMilestone.update(existing.id, { ...data, paid_amount: Number(existing.paid_amount) || 0 });
    else await base44.entities.PaymentMilestone.create({ workspace_id: workspaceId, quotation_id: quotationId, paid_amount: 0, status: "upcoming", ...data });
  }

  // 5. Update quotation
  await base44.entities.Quotation.update(quotationId, { event_id: event.id, sync_pending: false, sync_completed_at: new Date().toISOString() });
  return { ok: true, event: { id: event.id, title: event.title } };
}

// ---- Upgrade request ----

export async function submitUpgradeRequest(params) {
  const { workspace_id, requested_plan, requested_pricing_id, note } = params;
  return base44.entities.UpgradeRequest.create({
    workspace_id, requested_plan: requested_plan || "PRO",
    requested_pricing_id: requested_pricing_id || "",
    status: "PENDING", requested_at: new Date().toISOString(), note: note || ""
  });
}

// ---- Generate notifications ----
// Moved to notificationService.js — see generateNotifications() and createNotification().