// Shared job sheet data builder — used by both admin and public crew endpoints.
// ALL financial data is stripped here (hard safety rule).

import { supabaseAdmin } from "./supabaseClient.ts";

const EQUIPMENT_DEFAULTS: Record<string, string[]> = {
  PHOTOGRAPHY_VIDEOGRAPHY: ["Camera Body", "Lenses", "Drone", "Lights", "Tripod", "Batteries", "Memory Cards", "Laptop"],
  EVENT_MANAGEMENT: ["Walkie Talkies", "First Aid Kit", "Signage / Boards", "Stationery", "Power Strips", "Extension Cords", "Tool Kit"],
  ARCHITECTURE_INTERIOR: ["Laser Measure", "Measuring Tape", "Tablet", "Site Documents", "Camera", "Tripod", "Laptop"],
  OTHER: ["Camera", "Tripod", "Batteries", "Laptop"],
};

export function getDefaultEquipment(category: string): string[] {
  return EQUIPMENT_DEFAULTS[category] || EQUIPMENT_DEFAULTS.OTHER;
}

export async function buildJobSheetData(event: any, config?: any): Promise<any | null> {
  if (!event) return null;
  const eventId = event.id;

  // Fetch client
  let client: any = null;
  if (event.client_id) {
    const { data: c } = await supabaseAdmin.from("clients").select("*").eq("id", event.client_id).single();
    if (c) {
      client = {
        name: c.name, phone: c.phone || "", email: c.email || "",
        address: [c.address, c.city, c.state].filter(Boolean).join(", "),
      };
    }
  }

  // Fetch linked quotation
  let quotation: any = null;
  let items: any[] = [];
  const { data: quotations } = await supabaseAdmin
    .from("quotations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (quotations && quotations.length > 0) {
    quotation = quotations.find((q) => q.status === "Accepted" || q.status === "Finalized") || quotations[0];
    if (quotation) {
      const { data: itemData } = await supabaseAdmin
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id)
        .order("sort_order", { ascending: true })
        .limit(500);
      items = itemData || [];
    }
  }

  // Fetch team assignments
  const { data: teamAssignments } = await supabaseAdmin
    .from("event_team_assignments")
    .select("*")
    .eq("event_id", eventId)
    .eq("assignment_status", "Assigned");

  // Fetch service assignments
  const { data: serviceAssignments } = await supabaseAdmin
    .from("event_service_assignments")
    .select("*")
    .eq("event_id", eventId)
    .eq("assignment_status", "Assigned");

  // Collect team member IDs
  const memberIdSet = new Set<string>();
  for (const item of items) { if (item.team_member_id) memberIdSet.add(item.team_member_id); }
  for (const a of teamAssignments || []) { if (a.team_member_id) memberIdSet.add(a.team_member_id); }

  const teamMembers: any[] = [];
  for (const mid of memberIdSet) {
    const { data: m } = await supabaseAdmin.from("team_members").select("*").eq("id", mid).single();
    if (m) teamMembers.push(m);
  }
  const findMember = (mid: string) => teamMembers.find((m) => m.id === mid);

  // Build date-wise itinerary
  const itineraryMap = new Map<string, any>();
  for (const item of items) {
    const date = item.day_date;
    if (!date) continue;
    if (!itineraryMap.has(date)) {
      itineraryMap.set(date, { date, phase_title: "", crew: [] as any[], deliverables: [] as string[] });
    }
    const entry = itineraryMap.get(date);
    if (item.phase_title && !entry.phase_title) entry.phase_title = item.phase_title;
    if (item.item_type === "role") {
      const member = item.team_member_id ? findMember(item.team_member_id) : null;
      entry.crew.push({ role: item.name, member_name: member?.name || null, member_side: item.member_side || null });
    } else {
      entry.deliverables.push(item.name);
    }
  }

  // Fallback: EventTeamAssignments when no quotation items with dates
  if (itineraryMap.size === 0 && (teamAssignments || []).length > 0) {
    for (const a of teamAssignments) {
      const member = a.team_member_id ? findMember(a.team_member_id) : null;
      const dates = a.working_dates || [];
      for (const date of dates) {
        if (!itineraryMap.has(date)) {
          itineraryMap.set(date, { date, phase_title: "", crew: [], deliverables: [] });
        }
        itineraryMap.get(date).crew.push({
          role: a.role_name_snapshot || "Team Member",
          member_name: member?.name || null,
          member_side: a.category_type || null,
        });
      }
    }
  }

  let itinerary = Array.from(itineraryMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Build deliverables checklist
  const deliverables: string[] = [];
  for (const item of items) {
    if (item.item_type !== "role") deliverables.push(item.name);
  }
  if (deliverables.length === 0) {
    for (const s of serviceAssignments || []) {
      deliverables.push(s.service_name_snapshot || "Service");
    }
  }

  // Build crew directory
  let crewDirectory: any[] = [];
  const seenMemberIds = new Set<string>();
  for (const item of items) {
    if (item.item_type === "role" && item.team_member_id && !seenMemberIds.has(item.team_member_id)) {
      seenMemberIds.add(item.team_member_id);
      const member = findMember(item.team_member_id);
      if (member) crewDirectory.push({ name: member.name, role: item.name, phone: member.phone || "" });
    }
  }
  for (const a of teamAssignments || []) {
    if (a.team_member_id && !seenMemberIds.has(a.team_member_id)) {
      seenMemberIds.add(a.team_member_id);
      const member = findMember(a.team_member_id);
      if (member) crewDirectory.push({ name: member.name, role: a.role_name_snapshot || "Team Member", phone: member.phone || "" });
    }
  }

  // Apply display toggles
  if (config) {
    if (!config.show_team_names) {
      itinerary = itinerary.map((day) => ({
        ...day, crew: day.crew.map((c) => ({ ...c, member_name: null })),
      }));
    }
    if (!config.include_contacts) crewDirectory = [];
  }

  const destination = event.venue_address || event.venue || "";
  const mapUrl = destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : "";
  const category = quotation?.category || "";

  return {
    event: {
      title: event.title, event_type: event.event_type || "",
      start_date: event.start_date, end_date: event.end_date,
      venue: event.venue || "", venue_address: event.venue_address || "",
      description: event.description || "", notes: event.notes || "", status: event.status,
    },
    client, category, itinerary, deliverables, crew_directory: crewDirectory, map_url: mapUrl,
  };
}