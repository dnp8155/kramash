import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public, client-facing event tracking page. No auth — anyone with the event ID
// can view the event status, payment progress, team, and quotation link.
// Only exposes data safe for client viewing; no internal notes, expenses, or team payouts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const eventId = body.event_id || body.id;
    if (!eventId) return Response.json({ error: "Event id required" }, { status: 400 });

    let event = null;
    try {
      event = await base44.asServiceRole.entities.Event.get(eventId);
    } catch (e) { /* not found */ }
    if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
    if (event.status === "cancelled") {
      return Response.json({ error: "This event has been cancelled." }, { status: 404 });
    }

    // Fetch workspace, client, transactions, team assignments, team members, quotation
    const [workspace, client, transactions, assignments, members, quotations] = await Promise.all([
      base44.asServiceRole.entities.Workspace.get(event.workspace_id).catch(() => null),
      event.client_id ? base44.asServiceRole.entities.Client.get(event.client_id).catch(() => null) : Promise.resolve(null),
      base44.asServiceRole.entities.FinancialTransaction.filter(
        { workspace_id: event.workspace_id, event_id: event.id, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
        "-transaction_date",
        200
      ).catch(() => []),
      base44.asServiceRole.entities.EventTeamAssignment.filter(
        { workspace_id: event.workspace_id, event_id: event.id, assignment_status: "assigned" },
        "created_date",
        100
      ).catch(() => []),
      base44.asServiceRole.entities.TeamMember.filter(
        { workspace_id: event.workspace_id, status: "active" },
        "name",
        200
      ).catch(() => []),
      base44.asServiceRole.entities.Quotation.filter(
        { workspace_id: event.workspace_id, event_id: event.id, status: { $in: ["finalized", "accepted"] } },
        "-created_date",
        10
      ).catch(() => [])
    ]);

    // Build team list for this event
    const membersById = {};
    (members || []).forEach((m) => { membersById[m.id] = m; });
    const team = (assignments || []).map((a) => {
      const m = membersById[a.team_member_id];
      return {
        name: m?.name || "Team Member",
        profession: m?.profession || a.role_name_snapshot || "",
        role: a.role_name_snapshot || ""
      };
    });

    // Payment summary
    const contractValue = Number(event.contract_value) || 0;
    const received = (transactions || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pending = Math.max(0, contractValue - received);
    const paymentProgress = contractValue > 0 ? Math.min(100, Math.round((received / contractValue) * 100)) : 0;

    // Quotation (only the latest finalized/accepted one)
    const quotation = quotations && quotations.length > 0 ? {
      id: quotations[0].id,
      public_token: quotations[0].public_token || "",
      quotation_number: quotations[0].quotation_number,
      status: quotations[0].status,
      grand_total: Number(quotations[0].grand_total) || 0
    } : null;

    // Determine timeline milestones based on event status and dates
    const today = new Date().toISOString().slice(0, 10);
    const eventDates = event.event_dates && event.event_dates.length > 0
      ? event.event_dates
      : [event.start_date, event.end_date].filter(Boolean);
    const firstDate = eventDates[0] || event.start_date;
    const lastDate = eventDates[eventDates.length - 1] || event.end_date || event.start_date;

    let milestones = [];
    if (event.status === "upcoming") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_date?.slice(0, 10) },
        { label: "Planning & Coordination", done: firstDate && today < firstDate, date: null },
        { label: "Event Day", done: false, date: firstDate },
        { label: "Delivery & Wrap-up", done: false, date: null }
      ];
    } else if (event.status === "in-progress") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_date?.slice(0, 10) },
        { label: "Planning & Coordination", done: true, date: null },
        { label: "Event Day", done: true, date: firstDate },
        { label: "Delivery & Wrap-up", done: false, date: null }
      ];
    } else if (event.status === "completed") {
      milestones = [
        { label: "Booking Confirmed", done: true, date: event.created_date?.slice(0, 10) },
        { label: "Planning & Coordination", done: true, date: null },
        { label: "Event Day", done: true, date: firstDate },
        { label: "Delivery & Wrap-up", done: true, date: lastDate }
      ];
    }

    return Response.json({
      event: {
        id: event.id,
        title: event.title,
        event_type: event.event_type || "",
        start_date: event.start_date,
        end_date: event.end_date,
        event_dates: event.event_dates || [],
        venue: event.venue || "",
        venue_address: event.venue_address || "",
        status: event.status,
        contract_value: contractValue,
        description: event.description || ""
      },
      business: {
        name: workspace?.name || "",
        logo: workspace?.logo || "",
        phone: workspace?.phone || "",
        email: workspace?.email || "",
        address: workspace?.address || "",
        city: workspace?.city || "",
        custom_work_label_singular: workspace?.custom_work_label_singular || "",
        custom_work_label_plural: workspace?.custom_work_label_plural || "",
        business_category: workspace?.business_category || "OTHER"
      },
      client: client ? {
        name: client.name || ""
      } : null,
      payment: {
        contract_value: contractValue,
        received,
        pending,
        progress: paymentProgress,
        currency: workspace?.currency || "INR"
      },
      team,
      quotation,
      milestones
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}