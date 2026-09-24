import { withCors } from "../_shared/cors.ts";
// getPublicJobSheet — Public crew job sheet by token (no financial data).
import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { safeJson } from "../_shared/helpers.ts";

Deno.serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.public_token || body.token;
    const skipTracking = !!body.skip_tracking;
    if (!token) return Response.json({ error: "Token required" }, { status: 400 });

    const { data: list } = await supabaseAdmin.from("job_sheets").select("*").eq("public_token", token).order("created_at", { ascending: false }).limit(5);
    if (!list || list.length === 0) return Response.json({ error: "Job sheet not found" }, { status: 404 });
    const js = list[0];

    if (!js.public_link_enabled) return Response.json({ unavailable: true, message: "This Job Sheet link is no longer available." });

    if (!skipTracking) {
      const now = new Date().toISOString();
      const viewCount = (Number(js.portal_view_count) || 0) + 1;
      const firstViewed = js.portal_first_viewed_at || now;
      supabaseAdmin.from("job_sheets").update({ portal_view_count: viewCount, portal_first_viewed_at: firstViewed, portal_latest_viewed_at: now }).eq("id", js.id).then(() => {}, () => {});
    }

    const { data: event } = await supabaseAdmin.from("events").select("*").eq("id", js.event_id).single();
    if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

    let client = null;
    if (event.client_id) {
      const { data: c } = await supabaseAdmin.from("clients").select("*").eq("id", event.client_id).single();
      client = c;
    }
    const { data: quotations } = await supabaseAdmin.from("quotations").select("*").eq("workspace_id", js.workspace_id).eq("event_id", event.id).order("quotation_date", { ascending: false }).limit(200);
    const { data: teamAssignments } = await supabaseAdmin.from("event_team_assignments").select("*").eq("workspace_id", js.workspace_id).eq("event_id", event.id).eq("assignment_status", "assigned").order("created_at", { ascending: false }).limit(500);
    const { data: dayAssignments } = await supabaseAdmin.from("event_day_assignments").select("*").eq("workspace_id", js.workspace_id).eq("event_id", event.id).order("date", { ascending: true }).limit(1000);
    const { data: members } = await supabaseAdmin.from("team_members").select("*").eq("workspace_id", js.workspace_id).order("name", { ascending: true }).limit(500);

    const quotation = (quotations || []).find((q) => q.status === "accepted") || (quotations || [])[0] || null;
    let quotationItems: any[] = [];
    if (quotation) {
      const { data: qi } = await supabaseAdmin.from("quotation_items").select("*").eq("workspace_id", js.workspace_id).eq("quotation_id", quotation.id).order("sort_order", { ascending: true }).limit(1000);
      quotationItems = qi || [];
    }

    const membersById: Record<string, any> = {};
    (members || []).forEach((m) => { membersById[m.id] = m; });

    let equipment = [], deliverables = [], dateConfigs = {};
    equipment = safeJson(js.equipment_list) || [];
    deliverables = safeJson(js.deliverables) || [];
    dateConfigs = safeJson(js.date_configs) || {};

    const eventDates = (event.event_dates && event.event_dates.length) ? event.event_dates : [event.start_date].filter(Boolean);

    const itinerary = eventDates.map((date) => {
      const dayItems = quotationItems.filter((item) => item.day_date === date);
      const phases = [...new Set(dayItems.map((item) => item.phase_title).filter(Boolean))];
      const dc = dateConfigs[date] || {};
      const dayAssignment = (dayAssignments || []).find((d) => d.date === date);
      const assignedMembers = (teamAssignments || []).filter((a) => a.working_dates && a.working_dates.includes(date));
      const crewItems = dayItems.filter((item) => item.item_type === "role" || item.item_type === "team");

      const crewRoles: Record<string, number> = {};
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
}));