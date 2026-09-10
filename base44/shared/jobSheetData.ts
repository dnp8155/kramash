// Shared job sheet data builder — used by both the authenticated admin
// endpoint (getJobSheetData) and the public crew endpoint (getJobSheetPublicData).
// ALL financial data is stripped here (hard safety rule). When a config is
// provided, display toggles (show_team_names, include_contacts) are also
// applied server-side so disabled data never reaches the public client.

const EQUIPMENT_DEFAULTS: Record<string, string[]> = {
  PHOTOGRAPHY_VIDEOGRAPHY: ["Camera Body", "Lenses", "Drone", "Lights", "Tripod", "Batteries", "Memory Cards", "Laptop"],
  EVENT_MANAGEMENT: ["Walkie Talkies", "First Aid Kit", "Signage / Boards", "Stationery", "Power Strips", "Extension Cords", "Tool Kit"],
  ARCHITECTURE_INTERIOR: ["Laser Measure", "Measuring Tape", "Tablet", "Site Documents", "Camera", "Tripod", "Laptop"],
  OTHER: ["Camera", "Tripod", "Batteries", "Laptop"],
};

export function getDefaultEquipment(category: string): string[] {
  return EQUIPMENT_DEFAULTS[category] || EQUIPMENT_DEFAULTS.OTHER;
}

// Build operational job sheet data from an already-fetched event.
// Returns null if the event is falsy. Never includes financial fields.
export async function buildJobSheetData(base44: any, event: any, config?: any): Promise<any | null> {
  if (!event) return null;

  const eventId = event.id;

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

  // Collect all team member IDs
  const memberIdSet = new Set<string>();
  for (const item of items) {
    if (item.team_member_id) memberIdSet.add(item.team_member_id);
  }
  for (const a of teamAssignments) {
    if (a.team_member_id) memberIdSet.add(a.team_member_id);
  }

  const teamMembers: any[] = [];
  for (const mid of memberIdSet) {
    try {
      const m = await base44.asServiceRole.entities.TeamMember.get(mid);
      if (m) teamMembers.push(m);
    } catch {}
  }
  const findMember = (mid: string) => teamMembers.find((m) => m.id === mid);

  // ─── Build date-wise itinerary ───
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

  // Fallback: EventTeamAssignments when no quotation items with dates
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

  let itinerary = Array.from(itineraryMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // ─── Build deliverables checklist ───
  const deliverables: string[] = [];
  for (const item of items) {
    if (item.item_type !== "role") {
      deliverables.push(item.name);
    }
  }
  if (deliverables.length === 0) {
    for (const s of serviceAssignments) {
      deliverables.push(s.service_name_snapshot || "Service");
    }
  }

  // ─── Build crew directory ───
  let crewDirectory: any[] = [];
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

  // ─── Apply display toggles (server-side, for public access) ───
  if (config) {
    if (!config.show_team_names) {
      itinerary = itinerary.map((day: any) => ({
        ...day,
        crew: day.crew.map((c: any) => ({ ...c, member_name: null })),
      }));
    }
    if (!config.include_contacts) {
      crewDirectory = [];
    }
  }

  // ─── Build map URL ───
  const destination = event.venue_address || event.venue || "";
  const mapUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : "";

  const category = quotation?.category || "";

  return {
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
    category,
    itinerary,
    deliverables,
    crew_directory: crewDirectory,
    map_url: mapUrl,
    // NO financial fields anywhere
  };
}