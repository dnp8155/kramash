import { base44 } from "@/api/base44Client";
import { toISODate } from "@/lib/dates";

export const CATEGORY_DEFAULTS = {
  PHOTOGRAPHY: {
    equipment: [
      "Camera Body",
      "Prime Lenses (35mm, 50mm, 85mm)",
      "Wide Lens",
      "Telephoto Lens",
      "Tripod",
      "Memory Cards (spare)",
      "Batteries (spare)",
      "Flash / Speedlight",
      "Drone (if applicable)",
      "Laptop + Card Reader"
    ],
    deliverables: [
      "Bride Portraits",
      "Groom Portraits",
      "Couple Portraits",
      "Family Group Photos",
      "Ceremony Coverage",
      "Reception Coverage",
      "Candid Moments",
      "Drone Coverage (if applicable)"
    ]
  },
  EVENT_MANAGEMENT: {
    equipment: [
      "Walkie-Talkies",
      "First Aid Kit",
      "Toolkit",
      "Decor Checklist",
      "Sound Check Device",
      "Power Backup",
      "Tape & Markers"
    ],
    deliverables: [
      "Venue Setup",
      "Guest Coordination",
      "Vendor Management",
      "Timeline Management",
      "On-site Support",
      "Post-event Cleanup"
    ]
  },
  ARCHITECTURE: {
    equipment: [
      "Camera",
      "Lenses (Wide, Tilt-shift)",
      "Tripod",
      "Laser Measure",
      "Measuring Tape",
      "Tablet",
      "Site Documents / Blueprints",
      "Memory Cards",
      "Batteries"
    ],
    deliverables: [
      "Site Measurement",
      "Interior Photography",
      "Exterior Photography",
      "3D Walkthrough",
      "Floor Plan Documentation",
      "Progress Documentation"
    ]
  },
  INTERIOR: {
    equipment: [
      "Camera",
      "Lenses (Wide, Standard)",
      "Tripod",
      "Laser Measure",
      "Measuring Tape",
      "Material Samples",
      "Tablet",
      "Memory Cards",
      "Batteries"
    ],
    deliverables: [
      "Site Measurement",
      "Mood Board",
      "3D Visualization",
      "Material Selection",
      "Before/After Documentation",
      "Installation Supervision"
    ]
  },
  SALON_BEAUTY: {
    equipment: [
      "Makeup Kit",
      "Brushes & Sponges",
      "Hair Styling Tools",
      "Mirror & Lighting",
      "Towels & Capes",
      "Sanitizer & PPE",
      "Beauty Trolley",
      "Camera (for portfolio)"
    ],
    deliverables: [
      "Bridal Makeup",
      "Hair Styling",
      "Trial Session",
      "Touch-up Service",
      "Portfolio Photos"
    ]
  },
  CONSULTING: {
    equipment: [
      "Laptop",
      "Projector / Display Adapter",
      "Notepad & Pens",
      "Tablet",
      "Presentation Clicker",
      "Business Cards",
      "Portable Mic (for large rooms)"
    ],
    deliverables: [
      "Strategy Document",
      "Presentation Slides",
      "Workshop Facilitation",
      "Audit Report",
      "Action Plan"
    ]
  },
  AGENCY: {
    equipment: [
      "Laptop",
      "Camera / Gimbal",
      "Microphone",
      "Lighting Kit",
      "Tripod",
      "Portable Backdrop",
      "Laptop + Card Reader",
      "Memory Cards (spare)"
    ],
    deliverables: [
      "Campaign Content",
      "Social Media Posts",
      "Brand Shoot",
      "Video Reels",
      "Copy & Creatives",
      "Analytics Report"
    ]
  },
  CATERING: {
    equipment: [
      "Cooking Utensils",
      "Serving Equipment",
      "Chafing Dishes",
      "Cutlery & Crockery",
      "Food Thermometer",
      "Gloves & Hairnets",
      "Cooler / Hot Box",
      "Cleaning Supplies"
    ],
    deliverables: [
      "Menu Preparation",
      "On-site Cooking",
      "Buffet Setup",
      "Beverage Service",
      "Cleanup & Waste Disposal"
    ]
  },
  CONTRACTING: {
    equipment: [
      "Power Tools",
      "Hand Tools",
      "Safety Gear (Helmet, Gloves, Boots)",
      "Measuring Tape",
      "Level & Square",
      "Drill & Bits",
      "First Aid Kit",
      "Tool Belt"
    ],
    deliverables: [
      "Site Preparation",
      "Material Procurement",
      "Construction Work",
      "Quality Inspection",
      "Site Cleanup",
      "Handover Documentation"
    ]
  },
  OTHER: {
    equipment: ["Camera", "Tripod", "Memory Cards", "Batteries"],
    deliverables: ["Project Coverage"]
  }
};

export function getDefaultEquipment(category) {
  return CATEGORY_DEFAULTS[category]?.equipment || CATEGORY_DEFAULTS.OTHER.equipment;
}

export function getDefaultDeliverables(category) {
  return CATEGORY_DEFAULTS[category]?.deliverables || CATEGORY_DEFAULTS.OTHER.deliverables;
}

export function parseJSON(str, fallback) {
  try {
    const parsed = JSON.parse(str);
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getDateRange(startDate, endDate) {
  if (!startDate) return [];
  if (!endDate || endDate === startDate) return [startDate];
  const dates = [];
  let current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (current <= end) {
    dates.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function getOrCreateJobSheet(workspaceId, eventId, category, quotationId, eventNotes) {
  const existing = await base44.entities.JobSheet.filter({ workspace_id: workspaceId, event_id: eventId });
  if (existing.length > 0) return existing[0];

  return await base44.entities.JobSheet.create({
    workspace_id: workspaceId,
    event_id: eventId,
    quotation_id: quotationId || "",
    show_team_names: false,
    include_crew_contacts: false,
    include_equipment: false,
    show_job_sheet: false,
    equipment_list: JSON.stringify(getDefaultEquipment(category)),
    deliverables: JSON.stringify(getDefaultDeliverables(category)),
    date_configs: JSON.stringify({}),
    internal_notes: eventNotes || "",
    status: "active"
  });
}

export async function updateJobSheetConfig(id, config) {
  return await base44.entities.JobSheet.update(id, {
    show_team_names: config.show_team_names,
    include_crew_contacts: config.include_crew_contacts,
    include_equipment: config.include_equipment,
    show_job_sheet: config.show_job_sheet,
    equipment_list: JSON.stringify(config.equipment_list || []),
    deliverables: JSON.stringify(config.deliverables || []),
    date_configs: JSON.stringify(config.date_configs || {}),
    internal_notes: config.internal_notes || "",
    public_link_enabled: !!config.public_link_enabled,
    public_token: config.public_token || ""
  });
}

export function generatePublicToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function togglePublicLink(id, enabled, existingToken) {
  const token = enabled ? (existingToken || generatePublicToken()) : (existingToken || "");
  return await base44.entities.JobSheet.update(id, {
    public_link_enabled: enabled,
    public_token: token
  });
}

export async function assembleJobSheetData(workspaceId, eventId) {
  const event = await base44.entities.Event.get(eventId);
  if (!event || event.workspace_id !== workspaceId) return { notFound: true };

  const [client, quotations, teamAssignments, dayAssignments, members] = await Promise.all([
    event.client_id ? base44.entities.Client.get(event.client_id).catch(() => null) : null,
    base44.entities.Quotation.filter({ workspace_id: workspaceId, event_id: eventId }, "-quotation_date", 200).catch(() => []),
    base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: eventId, assignment_status: "assigned" }, "-created_date", 500),
    base44.entities.EventDayAssignment.filter({ workspace_id: workspaceId, event_id: eventId }, "date", 1000),
    base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500)
  ]);

  const quotation = quotations?.find(q => q.status === "accepted")
    || quotations?.find(q => q.status === "finalized")
    || quotations?.[0]
    || null;
  let quotationItems = [];
  if (quotation) {
    quotationItems = await base44.entities.QuotationItem.filter({ workspace_id: workspaceId, quotation_id: quotation.id }, "sort_order", 1000);
    // Keep the JobSheet config's stored quotation_id in sync with the resolved quotation
    try {
      const jobSheets = await base44.entities.JobSheet.filter({ workspace_id: workspaceId, event_id: eventId }, "-created_date", 5);
      const js = jobSheets?.[0];
      if (js && js.quotation_id !== quotation.id) {
        await base44.entities.JobSheet.update(js.id, { quotation_id: quotation.id });
      }
    } catch (e) { /* non-fatal */ }
  }

  const membersById = {};
  (members || []).forEach(m => { membersById[m.id] = m; });

  const eventDates = event.event_dates?.length
    ? event.event_dates
    : getDateRange(event.start_date, event.end_date);

  return {
    notFound: false,
    event,
    client,
    quotation,
    quotationItems,
    teamAssignments: teamAssignments || [],
    dayAssignments: dayAssignments || [],
    membersById,
    eventDates
  };
}

export function getDirectionsUrl(event, client) {
  const address = event?.venue_address
    || [event?.venue, client?.address, client?.city].filter(Boolean).join(", ");
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export const CATEGORY_LABELS = {
  PHOTOGRAPHY: "Photography",
  EVENT_MANAGEMENT: "Event Management",
  ARCHITECTURE: "Architecture",
  INTERIOR: "Interior Design",
  SALON_BEAUTY: "Salon & Beauty",
  CONSULTING: "Consulting",
  AGENCY: "Creative Agency",
  CATERING: "Catering",
  CONTRACTING: "Contracting",
  OTHER: "Other"
};