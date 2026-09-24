import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { safeJson } from "../../shared/helpers.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const list = await base44.asServiceRole.entities.JobSheetPortal.filter({ public_token: token }, "-created_date", 5);
    if (!list || list.length === 0) return Response.json({ error: "Job sheet not found" }, { status: 404 });
    const js = list[0];

    if (!js.is_enabled) return Response.json({ unavailable: true, message: "This Job Sheet link is no longer available." });

    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(js.view_count) || 0) + 1;
      const firstViewed = js.first_viewed_at || now;
      base44.asServiceRole.entities.JobSheetPortal.update(js.id, { view_count: viewCount, first_viewed_at: firstViewed, last_viewed_at: now }).catch(() => {});
    }

    const event = await base44.asServiceRole.entities.Event.get(js.event_id);
    if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

    let client = null;
    if (event.client_id) {
      try { client = await base44.asServiceRole.entities.Client.get(event.client_id); } catch {}
    }

    const quotations = await base44.asServiceRole.entities.Quotation.filter({ workspace_id: js.workspace_id, event_id: event.id }, "-quotation_date", 200);
    const teamAssignments = await base44.asServiceRole.entities.EventTeamAssignment.filter({ workspace_id: js.workspace_id, event_id: event.id, assignment_status: "assigned" }, "-created_date", 500);
    const dayAssignments = await base44.asServiceRole.entities.EventDayAssignment.filter({ workspace_id: js.workspace_id, event_id: event.id }, "start_date", 1000);
    const members = await base44.asServiceRole.entities.TeamMember.filter({ workspace_id: js.workspace_id }, "name", 500);

    const quotation = (quotations || []).find((q) => q.status === "accepted") || (quotations || [])[0] || null;
    let quotationItems = [];
    if (quotation) {
      quotationItems = await base44.asServiceRole.entities.QuotationItem.filter({ workspace_id: js.workspace_id, quotation_id: quotation.id }, "sort_order", 1000);
    }

    const membersById = {};
    (members || []).forEach((m) => { membersById[m.id] = m; });

    const equipment = safeJson(js.equipment_list) || [];
    const deliverables = safeJson(js.deliverables) || [];
    const dateConfigs = safeJson(js.date_configs) || {};

    const eventDates = (event.event_dates && event.event_dates.length) ? event.event_dates : [event.start_date].filter(Boolean);

    const itinerary = eventDates.map((date) => {
      const dayItems = (quotationItems || []).filter((item) => item.day_date === date);
      const phases = [...new Set(dayItems.map((item) => item.phase_title).filter(Boolean))];
      const dc = dateConfigs[date] || {};
      const dayAssignment = (dayAssignments || []).find((d) => d.date === date);
      const assignedMembers = (teamAssignments || []).filter((a) => a.working_dates && a.working_dates.includes(date));
      const crewItems = dayItems.filter((item) => item.item_type === "role" || item.item_type === "team");

      const crewRoles = {};
      crewItems.forEach((item) => {
        const name = item.name || "Crew";
        if (!crewRoles[name]) crewRoles[name] = 0;
        crewRoles[name] += (Number(item.quantity) || 1);
      });

      return {
        date, phase: dc.phase_title || phases[0] || "", reporting_time: dc.reporting_time || "",
        venue: dc.venue_override || dayAssignment?.venue_override || event.venue || "",
        crew_roles: Object.entries(crewRoles).map(([name, qty]) => ({ name, quantity: qty })),
        assigned_members: assignedMembers.map((a) => ({
          role: a.role_name_snapshot || "Crew",
          name: membersById[a.team_member_id]?.name || "",
          phone: membersById[a.team_member_id]?.phone || ""
        }))
      };
    });

    const crewDirectory = js.include_crew_contacts
      ? (teamAssignments || []).map((a) => ({
          name: membersById[a.team_member_id]?.name || "—",
          role: a.role_name_snapshot || "Crew",
          phone: membersById[a.team_member_id]?.phone || "—"
        }))
      : [];

    const addressForMap = event.venue_address || event.venue || [client?.address, client?.city].filter(Boolean).join(", ");
    const directionsUrl = addressForMap ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressForMap)}` : null;

    return Response.json({
      event: {
        title: event.title || "", event_type: event.event_type || "", venue: event.venue || "",
        venue_address: event.venue_address || "", start_date: event.start_date || "", end_date: event.end_date || "",
        event_dates: eventDates, directions_url: directionsUrl
      },
      client: { name: client?.name || "", phone: client?.phone || "" },
      config: { show_team_names: !!js.show_team_names, include_crew_contacts: !!js.include_crew_contacts, include_equipment: !!js.include_equipment },
      itinerary, deliverables, internal_notes: js.internal_notes || "", crew_directory: crewDirectory,
      equipment: js.include_equipment ? equipment : []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}