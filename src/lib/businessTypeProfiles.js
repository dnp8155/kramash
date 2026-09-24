// Central multi-industry business type profiles.
// Single source of truth for terminology, event types, roles, services, and member types.
// All consumers (businessTerminology, industryPresets, memberTypeService, eventTypeService,
// Onboarding, Preferences) read from this object.

// Lucide icon names (string) — resolved by callers via a shared icon map.
export const BUSINESS_TYPE_ICONS = {
  PHOTOGRAPHY: "Camera",
  EVENT_MANAGEMENT: "PartyPopper",
  ARCHITECTURE: "Building2",
  INTERIOR: "Sofa",
  SALON_BEAUTY: "Scissors",
  CONSULTING: "Briefcase",
  AGENCY: "Megaphone",
  CATERING: "UtensilsCrossed",
  CONTRACTING: "HardHat",
  OTHER: "Compass",
};

export const BUSINESS_TYPE_PROFILES = {
  PHOTOGRAPHY: {
    categoryKey: "PHOTOGRAPHY",
    label: "Photography",
    description: "Weddings, shoots, pre-wedding & studio work",
    workItemSingular: "Event",
    workItemPlural: "Events",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    titlePlaceholder: "e.g. Sharma Wedding Day 1",
    searchPlaceholder: "Search events, clients, venue",
    statusLabels: { upcoming: "Upcoming", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Wedding", "Pre-Wedding", "Reception", "Engagement", "Haldi", "Mehndi", "Birthday", "Corporate", "Portfolio", "Other"],
    roles: [
      { name: "Photographer", default_rate: 5000, rate_type: "Per Event" },
      { name: "Videographer", default_rate: 6000, rate_type: "Per Event" },
      { name: "Drone Operator", default_rate: 7000, rate_type: "Per Event" },
      { name: "Editor", default_rate: 3000, rate_type: "Per Event" },
      { name: "Assistant", default_rate: 2000, rate_type: "Per Event" },
    ],
    services: [
      { name: "Photography", default_rate: 30000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Videography", default_rate: 25000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Album", default_rate: 15000, rate_type: "Per Unit", gst_rate: 0 },
    ],
    memberTypes: [
      { id: "mt1", title: "Bride Side", color: "#c0392b" },
      { id: "mt2", title: "Groom Side", color: "#2980b9" },
      { id: "mt3", title: "Common", color: "#27ae60" },
    ],
  },

  EVENT_MANAGEMENT: {
    categoryKey: "EVENT_MANAGEMENT",
    label: "Event Management",
    description: "Weddings, corporate & social events coordination",
    workItemSingular: "Event",
    workItemPlural: "Events",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    titlePlaceholder: "e.g. Gupta Wedding 2026",
    searchPlaceholder: "Search events, clients, venue",
    statusLabels: { upcoming: "Upcoming", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Wedding", "Corporate", "Birthday", "Conference", "Exhibition", "Sangeet", "Reception", "Engagement", "Social Gathering", "Other"],
    roles: [
      { name: "Event Coordinator", default_rate: 8000, rate_type: "Per Event" },
      { name: "Decorator", default_rate: 10000, rate_type: "Per Event" },
      { name: "Lighting Technician", default_rate: 5000, rate_type: "Per Event" },
      { name: "Sound Technician", default_rate: 5000, rate_type: "Per Event" },
      { name: "Assistant", default_rate: 2000, rate_type: "Per Event" },
    ],
    services: [
      { name: "Event Coordination", default_rate: 15000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Decoration", default_rate: 25000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Lighting", default_rate: 12000, rate_type: "Fixed", gst_rate: 0 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client Side", color: "#c0392b" },
      { id: "mt2", title: "Vendor", color: "#2980b9" },
      { id: "mt3", title: "In-house", color: "#27ae60" },
    ],
  },

  ARCHITECTURE: {
    categoryKey: "ARCHITECTURE",
    label: "Architecture",
    description: "Projects, site visits & design assignments",
    workItemSingular: "Project",
    workItemPlural: "Projects",
    locationLabel: "Project Site",
    locationAddressLabel: "Site Address",
    titlePlaceholder: "e.g. Sharma Residence Design",
    searchPlaceholder: "Search projects, clients, site",
    statusLabels: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Residential", "Commercial", "Institutional", "Interior", "Renovation", "Site Visit", "Consultation", "Other"],
    roles: [
      { name: "Architect", default_rate: 25000, rate_type: "Fixed" },
      { name: "Designer", default_rate: 18000, rate_type: "Fixed" },
      { name: "Civil Engineer", default_rate: 20000, rate_type: "Per Day" },
      { name: "Site Supervisor", default_rate: 12000, rate_type: "Per Day" },
      { name: "Draftsman", default_rate: 8000, rate_type: "Fixed" },
    ],
    services: [
      { name: "Architectural Planning", default_rate: 50000, rate_type: "Fixed", gst_rate: 0 },
      { name: "3D Visualization", default_rate: 20000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Consultation", default_rate: 5000, rate_type: "Fixed", gst_rate: 0 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client", color: "#c0392b" },
      { id: "mt2", title: "Consultant", color: "#2980b9" },
      { id: "mt3", title: "Contractor", color: "#27ae60" },
    ],
  },

  INTERIOR: {
    categoryKey: "INTERIOR",
    label: "Interior Design",
    description: "Residential & commercial interior projects",
    workItemSingular: "Project",
    workItemPlural: "Projects",
    locationLabel: "Site",
    locationAddressLabel: "Site Address",
    titlePlaceholder: "e.g. Sharma 3BHK Interior",
    searchPlaceholder: "Search projects, clients, site",
    statusLabels: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Residential", "Commercial", "Modular", "Renovation", "Consultation", "Site Visit", "Other"],
    roles: [
      { name: "Interior Designer", default_rate: 20000, rate_type: "Fixed" },
      { name: "3D Visualizer", default_rate: 15000, rate_type: "Fixed" },
      { name: "Site Supervisor", default_rate: 10000, rate_type: "Per Day" },
      { name: "Carpenter", default_rate: 1500, rate_type: "Per Day" },
      { name: "Painter", default_rate: 1200, rate_type: "Per Day" },
    ],
    services: [
      { name: "Interior Design", default_rate: 40000, rate_type: "Fixed", gst_rate: 0 },
      { name: "3D Rendering", default_rate: 15000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Modular Kitchen", default_rate: 80000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Consultation", default_rate: 5000, rate_type: "Fixed", gst_rate: 0 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client", color: "#c0392b" },
      { id: "mt2", title: "Vendor", color: "#2980b9" },
      { id: "mt3", title: "Contractor", color: "#27ae60" },
    ],
  },

  SALON_BEAUTY: {
    categoryKey: "SALON_BEAUTY",
    label: "Salon / Beauty",
    description: "Hair, makeup, spa & bridal beauty services",
    workItemSingular: "Appointment",
    workItemPlural: "Appointments",
    locationLabel: "Salon",
    locationAddressLabel: "Salon Address",
    titlePlaceholder: "e.g. Bridal Makeup — Priya",
    searchPlaceholder: "Search appointments, clients",
    statusLabels: { upcoming: "Booked", "in-progress": "In Session", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Haircut", "Makeup", "Bridal Makeup", "Spa", "Facial", "Hair Treatment", "Manicure", "Pedicure", "Other"],
    roles: [
      { name: "Stylist", default_rate: 1500, rate_type: "Fixed" },
      { name: "Makeup Artist", default_rate: 5000, rate_type: "Fixed" },
      { name: "Beautician", default_rate: 2000, rate_type: "Fixed" },
      { name: "Spa Therapist", default_rate: 2500, rate_type: "Fixed" },
      { name: "Assistant", default_rate: 800, rate_type: "Fixed" },
    ],
    services: [
      { name: "Haircut", default_rate: 500, rate_type: "Fixed", gst_rate: 0 },
      { name: "Makeup", default_rate: 3000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Bridal Package", default_rate: 15000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Spa", default_rate: 2000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Facial", default_rate: 1200, rate_type: "Fixed", gst_rate: 0 },
    ],
    memberTypes: [
      { id: "mt1", title: "Walk-in", color: "#c0392b" },
      { id: "mt2", title: "Appointment", color: "#2980b9" },
      { id: "mt3", title: "Home Service", color: "#27ae60" },
    ],
  },

  CONSULTING: {
    categoryKey: "CONSULTING",
    label: "Consulting",
    description: "Business, audit & advisory engagements",
    workItemSingular: "Engagement",
    workItemPlural: "Engagements",
    locationLabel: "Client Office",
    locationAddressLabel: "Office Address",
    titlePlaceholder: "e.g. FY26 Tax Audit — ABC Ltd",
    searchPlaceholder: "Search engagements, clients",
    statusLabels: { upcoming: "Scheduled", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Consulting", "Audit", "Strategy", "Advisory", "Training", "Workshop", "Site Visit", "Other"],
    roles: [
      { name: "Consultant", default_rate: 15000, rate_type: "Fixed" },
      { name: "Analyst", default_rate: 8000, rate_type: "Per Day" },
      { name: "Associate", default_rate: 10000, rate_type: "Per Day" },
      { name: "Manager", default_rate: 25000, rate_type: "Fixed" },
      { name: "Advisor", default_rate: 20000, rate_type: "Fixed" },
    ],
    services: [
      { name: "Consulting", default_rate: 50000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Audit", default_rate: 30000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Strategy", default_rate: 75000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Training", default_rate: 20000, rate_type: "Fixed", gst_rate: 18 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client", color: "#c0392b" },
      { id: "mt2", title: "Team", color: "#2980b9" },
      { id: "mt3", title: "Partner", color: "#27ae60" },
    ],
  },

  AGENCY: {
    categoryKey: "AGENCY",
    label: "Agency",
    description: "Marketing, branding & creative campaigns",
    workItemSingular: "Campaign",
    workItemPlural: "Campaigns",
    locationLabel: "Client Location",
    locationAddressLabel: "Client Address",
    titlePlaceholder: "e.g. Summer Brand Launch — XYZ",
    searchPlaceholder: "Search campaigns, clients",
    statusLabels: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Campaign", "Brand Launch", "Social Media", "Photoshoot", "Video Production", "Event", "Print", "Digital", "Other"],
    roles: [
      { name: "Creative Director", default_rate: 30000, rate_type: "Fixed" },
      { name: "Designer", default_rate: 12000, rate_type: "Per Day" },
      { name: "Copywriter", default_rate: 10000, rate_type: "Per Day" },
      { name: "Photographer", default_rate: 8000, rate_type: "Per Day" },
      { name: "Account Manager", default_rate: 20000, rate_type: "Fixed" },
    ],
    services: [
      { name: "Branding", default_rate: 50000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Social Media", default_rate: 25000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Video Production", default_rate: 40000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Photography", default_rate: 20000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Design", default_rate: 15000, rate_type: "Fixed", gst_rate: 18 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client", color: "#c0392b" },
      { id: "mt2", title: "Creative", color: "#2980b9" },
      { id: "mt3", title: "Production", color: "#27ae60" },
    ],
  },

  CATERING: {
    categoryKey: "CATERING",
    label: "Catering",
    description: "Wedding, corporate & event catering",
    workItemSingular: "Event",
    workItemPlural: "Events",
    locationLabel: "Venue",
    locationAddressLabel: "Venue Address",
    titlePlaceholder: "e.g. Sharma Wedding Catering",
    searchPlaceholder: "Search events, clients, venue",
    statusLabels: { upcoming: "Booked", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Wedding", "Corporate", "Birthday", "Buffet", "Plated", "Cocktail", "House Party", "Other"],
    roles: [
      { name: "Chef", default_rate: 5000, rate_type: "Per Event" },
      { name: "Sous Chef", default_rate: 3500, rate_type: "Per Event" },
      { name: "Server", default_rate: 1000, rate_type: "Per Event" },
      { name: "Bartender", default_rate: 2000, rate_type: "Per Event" },
      { name: "Kitchen Helper", default_rate: 800, rate_type: "Per Event" },
    ],
    services: [
      { name: "Catering", default_rate: 350, rate_type: "Per Unit", gst_rate: 5 },
      { name: "Buffet", default_rate: 400, rate_type: "Per Unit", gst_rate: 5 },
      { name: "Live Counter", default_rate: 600, rate_type: "Per Unit", gst_rate: 5 },
      { name: "Bartending", default_rate: 15000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Dessert", default_rate: 250, rate_type: "Per Unit", gst_rate: 5 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client", color: "#c0392b" },
      { id: "mt2", title: "Kitchen", color: "#2980b9" },
      { id: "mt3", title: "Service", color: "#27ae60" },
    ],
  },

  CONTRACTING: {
    categoryKey: "CONTRACTING",
    label: "Contracting / Construction",
    description: "Civil, renovation & construction projects",
    workItemSingular: "Project",
    workItemPlural: "Projects",
    locationLabel: "Site",
    locationAddressLabel: "Site Address",
    titlePlaceholder: "e.g. Sharma House Construction",
    searchPlaceholder: "Search projects, clients, site",
    statusLabels: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Residential", "Commercial", "Renovation", "Repair", "Painting", "Plumbing", "Electrical", "Civil", "Other"],
    roles: [
      { name: "Contractor", default_rate: 30000, rate_type: "Fixed" },
      { name: "Mason", default_rate: 800, rate_type: "Per Day" },
      { name: "Electrician", default_rate: 1000, rate_type: "Per Day" },
      { name: "Plumber", default_rate: 900, rate_type: "Per Day" },
      { name: "Painter", default_rate: 700, rate_type: "Per Day" },
      { name: "Carpenter", default_rate: 1200, rate_type: "Per Day" },
    ],
    services: [
      { name: "Construction", default_rate: 1500, rate_type: "Per Unit", gst_rate: 18 },
      { name: "Renovation", default_rate: 50000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Electrical", default_rate: 15000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Plumbing", default_rate: 12000, rate_type: "Fixed", gst_rate: 18 },
      { name: "Painting", default_rate: 20000, rate_type: "Fixed", gst_rate: 18 },
    ],
    memberTypes: [
      { id: "mt1", title: "Client", color: "#c0392b" },
      { id: "mt2", title: "Labor", color: "#2980b9" },
      { id: "mt3", title: "Supplier", color: "#27ae60" },
    ],
  },

  OTHER: {
    categoryKey: "OTHER",
    label: "Other Service Business",
    description: "Custom service business — configure your own",
    workItemSingular: "Project",
    workItemPlural: "Projects",
    locationLabel: "Location",
    locationAddressLabel: "Location Address",
    titlePlaceholder: "e.g. Project name",
    searchPlaceholder: "Search projects, clients, location",
    statusLabels: { upcoming: "Planned", "in-progress": "In Progress", completed: "Completed", cancelled: "Cancelled" },
    eventTypes: ["Project", "Assignment", "Consultation", "Site Visit", "Contract", "Other"],
    roles: [],
    services: [],
    memberTypes: [
      { id: "mt1", title: "Type 1", color: "#c0392b" },
      { id: "mt2", title: "Type 2", color: "#2980b9" },
      { id: "mt3", title: "Type 3", color: "#27ae60" },
    ],
  },
};

// All valid business category keys (ordered for UI rendering).
export const BUSINESS_CATEGORY_KEYS = Object.keys(BUSINESS_TYPE_PROFILES);

// Resolve a profile by category key (falls back to OTHER).
export function getProfile(category) {
  return BUSINESS_TYPE_PROFILES[category] || BUSINESS_TYPE_PROFILES.OTHER;
}

// Infer a business category from a legacy free-text business_type string.
// Maps old workspaces to the new 10-value enum.
export function inferCategoryFromType(businessType) {
  if (!businessType) return "OTHER";
  const t = String(businessType).toLowerCase();
  if (t.includes("photo")) return "PHOTOGRAPHY";
  if (t.includes("event") || t.includes("wedding")) return "EVENT_MANAGEMENT";
  if (t.includes("architect")) return "ARCHITECTURE";
  if (t.includes("interior")) return "INTERIOR";
  if (t.includes("salon") || t.includes("beauty") || t.includes("makeup")) return "SALON_BEAUTY";
  if (t.includes("consult")) return "CONSULTING";
  if (t.includes("agency") || t.includes("marketing") || t.includes("brand")) return "AGENCY";
  if (t.includes("cater")) return "CATERING";
  if (t.includes("contract") || t.includes("construction") || t.includes("build")) return "CONTRACTING";
  return "OTHER";
}