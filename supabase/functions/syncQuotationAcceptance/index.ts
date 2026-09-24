import { withCors } from "../_shared/cors.ts";
// syncQuotationAcceptance — Sync accepted quotation to Event + Team + Service + Milestones.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { round2, groupBy, sumLineTotals, uniqueSortedDates, deriveEventDates, safeJson } from "../_shared/helpers.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { workspace_id, quotation_id } = body;
    if (!workspace_id || !quotation_id) {
      return Response.json({ error: "workspace_id and quotation_id are required" }, { status: 400 });
    }

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: quotation } = await supabaseAdmin.from("quotations").select("*").eq("id", quotation_id).single();
    if (!quotation || quotation.workspace_id !== workspace_id) {
      return Response.json({ error: "Quotation not found in this workspace" }, { status: 404 });
    }
    if (quotation.status !== "accepted") {
      return Response.json({ error: "Quotation must be accepted before syncing" }, { status: 400 });
    }

    const { data: items } = await supabaseAdmin
      .from("quotation_items")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("quotation_id", quotation_id)
      .order("sort_order", { ascending: true })
      .limit(500);

    let clientSnapshot = null, eventSnapshot = null;
    clientSnapshot = safeJson(quotation.client_snapshot) || {};
    eventSnapshot = safeJson(quotation.event_snapshot) || {};

    // 1. CREATE OR UPDATE EVENT
    let event = null, eventCreated = false;
    if (quotation.event_id) {
      const { data: e } = await supabaseAdmin.from("events").select("*").eq("id", quotation.event_id).single();
      if (e && e.workspace_id === workspace_id) event = e;
    }

    const eventDates = deriveEventDates(quotation);
    const eventPayload = {
      client_id: quotation.client_id || "",
      title: clientSnapshot?.name
        ? `${clientSnapshot.name} — ${quotation.project_title || eventSnapshot?.title || quotation.quotation_number}`
        : (quotation.project_title || eventSnapshot?.title || quotation.quotation_number),
      event_type: eventSnapshot?.event_type || "",
      start_date: quotation.start_date || eventSnapshot?.start_date || quotation.quotation_date,
      end_date: quotation.end_date || eventSnapshot?.end_date || quotation.start_date || quotation.quotation_date,
      event_dates: eventDates,
      venue: eventSnapshot?.venue || "", venue_address: eventSnapshot?.venue_address || "",
      contract_value: Number(quotation.grand_total) || 0,
      status: "upcoming", description: quotation.project_summary || "",
      notes: `Auto-synced from quotation ${quotation.quotation_number}`
    };

    if (event) {
      const updateData = { ...eventPayload };
      if (event.status === "in-progress" || event.status === "completed") delete updateData.status;
      const { data: updated } = await supabaseAdmin.from("events").update(updateData).eq("id", event.id).select("*").single();
      event = updated;
    } else {
      const { data: created } = await supabaseAdmin.from("events").insert({ workspace_id, ...eventPayload }).select("*").single();
      event = created;
      eventCreated = true;
    }

    // 2. SYNC TEAM ASSIGNMENTS
    const teamItems = (items || []).filter((it) => it.item_type === "team" && it.team_member_id);
    const teamByMember = groupBy(teamItems, "team_member_id");
    const teamSynced = [];
    for (const [memberId, memberItems] of Object.entries(teamByMember)) {
      const first = memberItems[0];
      const agreedRate = sumLineTotals(memberItems);
      const workingDates = uniqueSortedDates(memberItems.map((it) => it.day_date).filter(Boolean));
      const rateType = first.rate_type || "Per Event";

      const { data: existing } = await supabaseAdmin
        .from("event_team_assignments")
        .select("*")
        .eq("workspace_id", workspace_id).eq("event_id", event.id)
        .eq("team_member_id", memberId).eq("assignment_status", "assigned")
        .limit(1);

      const assignmentData = {
        role_id: first.reference_id || "", role_name_snapshot: "",
        member_type_id: "", member_type_snapshot: first.member_type || "",
        agreed_rate: agreedRate, rate_type: rateType, working_dates: workingDates,
        booking_start_date: workingDates[0] || "",
        booking_end_date: workingDates[workingDates.length - 1] || workingDates[0] || "",
        notes: `Synced from quotation ${quotation.quotation_number}`
      };

      if (existing && existing.length > 0) {
        const { data: updated } = await supabaseAdmin.from("event_team_assignments").update(assignmentData).eq("id", existing[0].id).select("*").single();
        teamSynced.push({ member_id: memberId, action: "updated", id: updated.id });
      } else {
        const { data: created } = await supabaseAdmin.from("event_team_assignments")
          .insert({ workspace_id, event_id: event.id, team_member_id: memberId, assignment_status: "assigned", ...assignmentData })
          .select("*").single();
        teamSynced.push({ member_id: memberId, action: "created", id: created.id });
      }
    }

    const teamMemberIds = Object.keys(teamByMember);
    await supabaseAdmin.from("events").update({ team_member_ids: teamMemberIds }).eq("id", event.id);

    // 3. SYNC SERVICE ASSIGNMENTS
    const serviceItems = (items || []).filter((it) => it.item_type === "service" && it.reference_id);
    const serviceByRef = groupBy(serviceItems, "reference_id");
    const serviceSynced = [];
    for (const [serviceId, svcItems] of Object.entries(serviceByRef)) {
      const first = svcItems[0];
      const agreedRate = sumLineTotals(svcItems);
      const isAddon = svcItems.some((it) => it.is_addon);

      const { data: existing } = await supabaseAdmin
        .from("event_service_assignments")
        .select("*")
        .eq("workspace_id", workspace_id).eq("event_id", event.id)
        .eq("service_id", serviceId).eq("assignment_status", "assigned")
        .limit(1);

      const assignmentData = {
        service_name_snapshot: first.name || "", provider_id: "", provider_name_snapshot: "",
        agreed_rate: agreedRate, rate_type: first.rate_type || "Fixed", is_addon: isAddon,
        notes: `Synced from quotation ${quotation.quotation_number}`
      };

      if (existing && existing.length > 0) {
        const { data: updated } = await supabaseAdmin.from("event_service_assignments").update(assignmentData).eq("id", existing[0].id).select("*").single();
        serviceSynced.push({ service_id: serviceId, action: "updated", id: updated.id });
      } else {
        const { data: created } = await supabaseAdmin.from("event_service_assignments")
          .insert({ workspace_id, event_id: event.id, service_id: serviceId, assignment_status: "assigned", ...assignmentData })
          .select("*").single();
        serviceSynced.push({ service_id: serviceId, action: "created", id: created.id });
      }
    }

    const serviceIds = Object.keys(serviceByRef);
    await supabaseAdmin.from("events").update({ service_ids: serviceIds }).eq("id", event.id);

    // 4. SYNC FINANCIAL YEAR
    const eventDate = event.start_date || quotation.quotation_date;
    let financialYearId = "", fyLabel = "";
    const { data: fys } = await supabaseAdmin.from("financial_years").select("*").eq("workspace_id", workspace_id).order("start_date", { ascending: false }).limit(100);
    const fy = (fys || []).find((f) => eventDate >= f.start_date && eventDate <= f.end_date);
    if (fy) { financialYearId = fy.id; fyLabel = fy.fy_id.replace(/^FY\s*/, "").trim(); }
    if (fyLabel) await supabaseAdmin.from("events").update({ financial_year: fyLabel }).eq("id", event.id);

    // 5. CREATE/UPDATE MILESTONE DUES
    let milestones = [];
    milestones = safeJson(quotation.payment_schedule_json) || [];

    const grandTotal = Number(quotation.grand_total) || 0;
    const milestonesSynced = [];
    const { data: existingMilestones } = await supabaseAdmin
      .from("payment_milestones")
      .select("*")
      .eq("workspace_id", workspace_id).eq("quotation_id", quotation_id)
      .order("sort_order", { ascending: true })
      .limit(100);

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.name || !m.name.trim()) continue;
      const value = Math.max(0, Number(m.value) || 0);
      const dueAmount = m.type === "fixed" ? round2(value) : round2((grandTotal * value) / 100);

      let calculatedDueDate = m.due_date || "";
      const dtype = m.due_date_type || "";
      if (dtype === "on_signing") calculatedDueDate = quotation.quotation_date || "";
      else if (dtype === "event_day") calculatedDueDate = event.start_date || quotation.start_date || "";
      else if (dtype === "day_after_event") {
        const endDate = event.end_date || event.start_date || quotation.end_date || quotation.start_date || "";
        if (endDate) { const d = new Date(endDate + "T00:00:00"); d.setDate(d.getDate() + 1); calculatedDueDate = d.toISOString().slice(0, 10); }
      }

      const existing = (existingMilestones || []).find((em) => em.name === m.name && em.quotation_id === quotation_id);
      const milestoneData = {
        event_id: event.id, client_id: quotation.client_id || "", name: m.name.trim(),
        description: m.due_condition || "", sort_order: i, milestone_type: m.type || "percent",
        milestone_value: value, due_amount: dueAmount, due_condition: m.due_condition || "",
        due_date: calculatedDueDate, financial_year_id: financialYearId
      };

      if (existing) {
        const { data: updated } = await supabaseAdmin.from("payment_milestones")
          .update({ ...milestoneData, paid_amount: Number(existing.paid_amount) || 0 })
          .eq("id", existing.id).select("*").single();
        milestonesSynced.push({ name: m.name, action: "updated", id: updated.id });
      } else {
        const { data: created } = await supabaseAdmin.from("payment_milestones")
          .insert({ workspace_id, quotation_id, paid_amount: 0, status: "upcoming", ...milestoneData })
          .select("*").single();
        milestonesSynced.push({ name: m.name, action: "created", id: created.id });
      }
    }

    // 6. UPDATE QUOTATION
    await supabaseAdmin.from("quotations").update({
      event_id: event.id, sync_pending: false, sync_completed_at: new Date().toISOString()
    }).eq("id", quotation_id);

    return Response.json({
      ok: true, event: { id: event.id, title: event.title, created: eventCreated },
      team_synced: teamSynced, service_synced: serviceSynced, milestones_synced: milestonesSynced,
      financial_year: fyLabel, payments_created: 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));