import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Internal endpoint — requires authentication. Returns operational job sheet
// data for crew execution. ALL financial data is stripped at the backend
// (hard safety rule, not merely visual hiding). The response never contains
// rates, costs, amounts, discounts, GST, margins, contract value, or payment data.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — only authenticated workspace members can generate job sheets
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const eventId = body?.event_id;
    if (!eventId) {
      return Response.json({ error: "event_id is required" }, { status: 400 });
    }

    // Fetch event
    let event: any;
    try {
      event = await base44.asServiceRole.entities.Event.get(eventId);
    } catch {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify workspace access
    const workspace = await base44.asServiceRole.entities.Workspace.get(event.workspace_id);
    if (!workspace) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const isMember =
      workspace.owner_user_id === user.id ||
      (workspace.member_user_ids || []).includes(user.id) ||
      user.role === "admin";
    if (!isMember) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch client
    let client: any = null;
    if (event.client_id) {
      try {
        const c = await base44.asServiceRole.entities.Client.get(event.client_id);
        if (c) {
          client = {
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            address: [c.address, c.city, c.state].filter(Boolean).join(", "),
          };
        }
      } catch {}
    }

    // Fetch linked quotation (Accepted or Finalized preferred)
    let quotation: any = null;
    let items: any[] = [];
    try {
      const quotations = await base44.asServiceRole.entities.Quotation.filter(
        { event_id: eventId },
        "-created_date",
        10
      );
      if (quotations && quotations.length > 0) {
        quotation =
          quotations.find((q: any) => q.status === "Accepted" || q.status === "Finalized") ||
          quotations[0];
        if (quotation) {
          items = await base44.asServiceRole.entities.QuotationItem.filter(
            { quotation_id: quotation.id },
            "sort_order",
            500
          );
        }
      }
    } catch {}

    // Fetch team assignments
    let teamAssignments: any[] = [];
    try {
      teamAssignments = await base44.asServiceRole.entities.EventTeamAssignment.filter({
        event_id: eventId,
        assignment_status: "Assigned",
      });
    } catch {}

    // Fetch service assignments
    let serviceAssignments: any[] = [];
    try {
      serviceAssignments = await base44.asServiceRole.entities.EventServiceAssignment.filter({
        event_id: eventId,
        assignment_status: "Assigned",
      });
    } catch {}

    // Collect all team member IDs from quotation items and team assignments
    const memberIdSet = new Set<string>();
    for (const item of items) {
      if (item.team_member_id) memberIdSet.add(item.team_member_id);
    }
    for (const a of teamAssignments) {
      if (a.team_member_id) memberIdSet.add(a.team_member_id);
    }

    // Fetch all team members
    const teamMembers: any[] = [];
    for (const mid of memberIdSet) {
      try {
        const m = await base44.asServiceRole.entities.TeamMember.get(mid);
        if (m) teamMembers.push(m);
      } catch {}
    }
    const findMember = (mid: string) => teamMembers.find((m) => m.id === mid);

    // ─── Build date-wise itinerary ───
    // Primary source: QuotationItems (have day_date, phase_title, item_type, name, team_member_id)
    // Fallback: EventTeamAssignments (have working_dates, role_name_snapshot)
    // NO financial fields are included anywhere.
    const itineraryMap = new Map<string, any>();

    for (const item of items) {
      const date = item.day_date;
      if (!date) continue;

      if (!itineraryMap.has(date)) {
        itineraryMap.set(date, {
          date,
          phase_title: "",
          crew: [] as any[],
          deliverables: [] as string[],
        });
      }
      const entry = itineraryMap.get(date);
      if (item.phase_title && !entry.phase_title) {
        entry.phase_title = item.phase_title;
      }

      if (item.item_type === "role") {
        const member = item.team_member_id ? findMember(item.team_member_id) : null;
        entry.crew.push({
          role: item.name,
          member_name: member?.name || null,
          member_side: item.member_side || null,
        });
      } else {
        entry.deliverables.push(item.name);
      }
    }

    // Fallback: if no quotation items with dates, use EventTeamAssignments
    if (itineraryMap.size === 0 && teamAssignments.length > 0) {
      for (const a of teamAssignments) {
        const member = a.team_member_id ? findMember(a.team_member_id) : null;
        const dates = a.working_dates || [];
        for (const date of dates) {
          if (!itineraryMap.has(date)) {
            itineraryMap.set(date, {
              date,
              phase_title: "",
              crew: [] as any[],
              deliverables: [] as string[],
            });
          }
          itineraryMap.get(date).crew.push({
            role: a.role_name_snapshot || "Team Member",
            member_name: member?.name || null,
            member_side: a.category_type || null,
          });
        }
      }
    }

    const itinerary = Array.from(itineraryMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ─── Build deliverables checklist (all service/custom items) ───
    const deliverables: string[] = [];
    for (const item of items) {
      if (item.item_type !== "role") {
        deliverables.push(item.name);
      }
    }
    // Fallback: service assignment names
    if (deliverables.length === 0) {
      for (const s of serviceAssignments) {
        deliverables.push(s.service_name_snapshot || "Service");
      }
    }

    // ─── Build crew directory (all assigned members with contact info) ───
    const crewDirectory: any[] = [];
    const seenMemberIds = new Set<string>();

    for (const item of items) {
      if (item.item_type === "role" && item.team_member_id && !seenMemberIds.has(item.team_member_id)) {
        seenMemberIds.add(item.team_member_id);
        const member = findMember(item.team_member_id);
        if (member) {
          crewDirectory.push({
            name: member.name,
            role: item.name,
            phone: member.phone || "",
          });
        }
      }
    }
    for (const a of teamAssignments) {
      if (a.team_member_id && !seenMemberIds.has(a.team_member_id)) {
        seenMemberIds.add(a.team_member_id);
        const member = findMember(a.team_member_id);
        if (member) {
          crewDirectory.push({
            name: member.name,
            role: a.role_name_snapshot || "Team Member",
            phone: member.phone || "",
          });
        }
      }
    }

    // ─── Build map URL (Google Maps directions) ───
    const destination = event.venue_address || event.venue || "";
    const mapUrl = destination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
      : "";

    // ─── Return response (NO financial data) ───
    // Fields explicitly excluded: contract_value, unit_rate, line_total,
    // agreed_rate, rate, subtotal, discount_*, gst_*, grand_total, amount,
    // payment amounts, milestones with amounts.
    return Response.json({
      event: {
        title: event.title,
        event_type: event.event_type || "",
        start_date: event.start_date,
        end_date: event.end_date,
        venue: event.venue || "",
        venue_address: event.venue_address || "",
        description: event.description || "",
        notes: event.notes || "",
        status: event.status,
      },
      client,
      category: quotation?.category || workspace.business_category || "",
      itinerary,
      deliverables,
      crew_directory: crewDirectory,
      map_url: mapUrl,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}