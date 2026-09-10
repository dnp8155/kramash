import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";
import {
  round2, groupBy, sumLineTotals, uniqueSortedDates, deriveEventDates
} from "../../shared/quotationHelpers.ts";

// Syncs an accepted quotation to the Event + Financial architecture.
// Creates/updates Event, Team assignments, Service assignments, and Payment Milestone dues.
// Does NOT create any payment transactions (acceptance ≠ payment).
// Idempotent: re-running on the same quotation updates/reconciles existing records.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workspace_id, quotation_id } = body;
    if (!workspace_id || !quotation_id) {
      return Response.json({ error: "workspace_id and quotation_id are required" }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    // Load quotation (user context — RLS allows since user created it)
    let quotation = null;
    try {
      quotation = await base44.entities.Quotation.get(quotation_id);
    } catch (e) { /* not found */ }
    if (!quotation || quotation.workspace_id !== workspace_id) {
      return Response.json({ error: "Quotation not found in this workspace" }, { status: 404 });
    }
    if (quotation.status !== "accepted") {
      return Response.json({ error: "Quotation must be accepted before syncing" }, { status: 400 });
    }

    // Load quotation items
    const items = await base44.entities.QuotationItem.filter(
      { workspace_id, quotation_id }, "sort_order", 500
    );

    // Parse client snapshot for event title fallback
    let clientSnapshot = null;
    try { clientSnapshot = JSON.parse(quotation.client_snapshot || "{}"); } catch (e) { /* ignore */ }
    let eventSnapshot = null;
    try { eventSnapshot = JSON.parse(quotation.event_snapshot || "{}"); } catch (e) { /* ignore */ }

    // ---- 1. CREATE OR UPDATE EVENT ----
    let event = null;
    let eventCreated = false;
    if (quotation.event_id) {
      try {
        event = await base44.entities.Event.get(quotation.event_id);
        if (!event || event.workspace_id !== workspace_id) event = null;
      } catch (e) { /* not found */ }
    }

    // Derive event dates from quotation
    const eventDates = deriveEventDates(quotation);

    const eventPayload = {
      client_id: quotation.client_id || "",
      title: quotation.project_title || eventSnapshot?.title || clientSnapshot?.name
        ? `${clientSnapshot?.name || ""} — ${quotation.project_title || eventSnapshot?.title || quotation.quotation_number}`
        : quotation.quotation_number,
      event_type: quotation.category || "",
      start_date: quotation.start_date || eventSnapshot?.start_date || quotation.quotation_date,
      end_date: quotation.end_date || eventSnapshot?.end_date || quotation.start_date || quotation.quotation_date,
      event_dates: eventDates,
      venue: eventSnapshot?.venue || "",
      venue_address: eventSnapshot?.venue_address || "",
      contract_value: Number(quotation.grand_total) || 0,
      status: "upcoming",
      description: quotation.project_summary || "",
      notes: `Auto-synced from quotation ${quotation.quotation_number}`
    };

    if (event) {
      // Update existing event — preserve status if already in-progress/completed
      const updateData = { ...eventPayload };
      if (event.status === "in-progress" || event.status === "completed") {
        delete updateData.status;
      }
      event = await base44.entities.Event.update(event.id, updateData);
    } else {
      event = await base44.entities.Event.create({
        workspace_id,
        ...eventPayload
      });
      eventCreated = true;
    }

    // ---- 2. SYNC TEAM ASSIGNMENTS ----
    const teamItems = (items || []).filter(
      (it) => it.item_type === "team" && it.team_member_id
    );
    const teamByMember = groupBy(teamItems, "team_member_id");
    const teamSynced = [];
    for (const [memberId, memberItems] of Object.entries(teamByMember)) {
      const first = memberItems[0];
      const agreedRate = sumLineTotals(memberItems);
      const workingDates = uniqueSortedDates(memberItems.map((it) => it.day_date).filter(Boolean));
      const rateType = first.rate_type || "Per Event";

      // Check for existing assignment
      const existing = await base44.entities.EventTeamAssignment.filter({
        workspace_id, event_id: event.id, team_member_id: memberId,
        assignment_status: "assigned"
      });

      const assignmentData = {
        role_id: first.reference_id || "",
        role_name_snapshot: "", // resolved below if needed
        member_type_id: "",
        member_type_snapshot: first.member_type || "",
        agreed_rate: agreedRate,
        rate_type: rateType,
        working_dates: workingDates,
        booking_start_date: workingDates[0] || "",
        booking_end_date: workingDates[workingDates.length - 1] || workingDates[0] || "",
        notes: `Synced from quotation ${quotation.quotation_number}`
      };

      if (existing && existing.length > 0) {
        const updated = await base44.entities.EventTeamAssignment.update(existing[0].id, assignmentData);
        teamSynced.push({ member_id: memberId, action: "updated", id: updated.id });
      } else {
        const created = await base44.entities.EventTeamAssignment.create({
          workspace_id,
          event_id: event.id,
          team_member_id: memberId,
          assignment_status: "assigned",
          ...assignmentData
        });
        teamSynced.push({ member_id: memberId, action: "created", id: created.id });
      }
    }

    // Sync event.team_member_ids
    const teamMemberIds = Object.keys(teamByMember);
    await base44.entities.Event.update(event.id, { team_member_ids: teamMemberIds });

    // ---- 3. SYNC SERVICE ASSIGNMENTS ----
    const serviceItems = (items || []).filter(
      (it) => it.item_type === "service" && it.reference_id
    );
    const serviceByRef = groupBy(serviceItems, "reference_id");
    const serviceSynced = [];
    for (const [serviceId, svcItems] of Object.entries(serviceByRef)) {
      const first = svcItems[0];
      const agreedRate = sumLineTotals(svcItems);
      const isAddon = svcItems.some((it) => it.is_addon);

      const existing = await base44.entities.EventServiceAssignment.filter({
        workspace_id, event_id: event.id, service_id: serviceId,
        assignment_status: "assigned"
      });

      const assignmentData = {
        service_name_snapshot: first.name || "",
        provider_id: "",
        provider_name_snapshot: "",
        agreed_rate: agreedRate,
        rate_type: first.rate_type || "Fixed",
        is_addon: isAddon,
        notes: `Synced from quotation ${quotation.quotation_number}`
      };

      if (existing && existing.length > 0) {
        const updated = await base44.entities.EventServiceAssignment.update(existing[0].id, assignmentData);
        serviceSynced.push({ service_id: serviceId, action: "updated", id: updated.id });
      } else {
        const created = await base44.entities.EventServiceAssignment.create({
          workspace_id,
          event_id: event.id,
          service_id: serviceId,
          assignment_status: "assigned",
          ...assignmentData
        });
        serviceSynced.push({ service_id: serviceId, action: "created", id: created.id });
      }
    }

    // Sync event.service_ids
    const serviceIds = Object.keys(serviceByRef);
    await base44.entities.Event.update(event.id, { service_ids: serviceIds });

    // ---- 4. SYNC FINANCIAL YEAR ----
    // Resolve FY for the event start date
    const eventDate = event.start_date || quotation.quotation_date;
    let financialYearId = "";
    let fyLabel = "";
    const fys = await base44.entities.FinancialYear.filter(
      { workspace_id }, "-start_date", 100
    );
    const fy = (fys || []).find((f) => eventDate >= f.start_date && eventDate <= f.end_date);
    if (fy) {
      financialYearId = fy.id;
      fyLabel = fy.fy_id.replace(/^FY\s*/, "").trim();
    }

    // Update event.financial_year
    if (fyLabel) {
      await base44.entities.Event.update(event.id, { financial_year: fyLabel });
    }

    // ---- 5. CREATE/UPDATE MILESTONE DUES ----
    let milestones = [];
    try {
      milestones = JSON.parse(quotation.payment_schedule_json || "[]");
    } catch (e) { milestones = []; }

    const grandTotal = Number(quotation.grand_total) || 0;
    const milestonesSynced = [];

    // Load existing milestones for this quotation
    const existingMilestones = await base44.entities.PaymentMilestone.filter(
      { workspace_id, quotation_id }, "sort_order", 100
    );

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.name || !m.name.trim()) continue;
      const value = Math.max(0, Number(m.value) || 0);
      const dueAmount = m.type === "fixed"
        ? round2(value)
        : round2((grandTotal * value) / 100);

      // Find existing milestone by name (idempotent)
      const existing = (existingMilestones || []).find(
        (em) => em.name === m.name && em.quotation_id === quotation_id
      );

      const milestoneData = {
        event_id: event.id,
        client_id: quotation.client_id || "",
        name: m.name.trim(),
        description: m.due_condition || "",
        sort_order: i,
        milestone_type: m.type || "percent",
        milestone_value: value,
        due_amount: dueAmount,
        due_condition: m.due_condition || "",
        due_date: m.due_date || "",
        financial_year_id: financialYearId
      };

      if (existing) {
        // Update due_amount but preserve paid_amount (payments are separate)
        const updated = await base44.entities.PaymentMilestone.update(existing.id, {
          ...milestoneData,
          paid_amount: Number(existing.paid_amount) || 0
        });
        milestonesSynced.push({ name: m.name, action: "updated", id: updated.id });
      } else {
        const created = await base44.entities.PaymentMilestone.create({
          workspace_id,
          quotation_id,
          paid_amount: 0,
          status: "upcoming",
          ...milestoneData
        });
        milestonesSynced.push({ name: m.name, action: "created", id: created.id });
      }
    }

    // ---- 6. UPDATE QUOTATION ----
    await base44.entities.Quotation.update(quotation_id, {
      event_id: event.id,
      sync_pending: false,
      sync_completed_at: new Date().toISOString()
    });

    return Response.json({
      ok: true,
      event: { id: event.id, title: event.title, created: eventCreated },
      team_synced: teamSynced,
      service_synced: serviceSynced,
      milestones_synced: milestonesSynced,
      financial_year: fyLabel,
      payments_created: 0  // explicitly 0 — acceptance ≠ payment
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Helpers are imported from shared/quotationHelpers.ts