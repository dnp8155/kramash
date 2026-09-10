// Phase 10 — Industry-specific starter presets for new workspaces.
// Applied ONLY on new workspace creation (never force-applied to existing
// workspaces or on category change). All presets are editable/removable by
// the user after seeding.

export const INDUSTRY_PRESETS = {
  PHOTOGRAPHY: {
    roles: [
      { name: "Photographer", default_rate: 5000, rate_type: "Per Event" },
      { name: "Videographer", default_rate: 6000, rate_type: "Per Event" },
      { name: "Drone Operator", default_rate: 7000, rate_type: "Per Event" },
      { name: "Editor", default_rate: 3000, rate_type: "Per Event" },
      { name: "Assistant", default_rate: 2000, rate_type: "Per Event" }
    ],
    services: [
      { name: "Photography", default_rate: 30000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Videography", default_rate: 25000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Album", default_rate: 15000, rate_type: "Per Unit", gst_rate: 0 }
    ]
  },
  EVENT_MANAGEMENT: {
    roles: [
      { name: "Event Coordinator", default_rate: 8000, rate_type: "Per Event" },
      { name: "Decorator", default_rate: 10000, rate_type: "Per Event" },
      { name: "Lighting Technician", default_rate: 5000, rate_type: "Per Event" },
      { name: "Sound Technician", default_rate: 5000, rate_type: "Per Event" },
      { name: "Assistant", default_rate: 2000, rate_type: "Per Event" }
    ],
    services: [
      { name: "Event Coordination", default_rate: 15000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Decoration", default_rate: 25000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Lighting", default_rate: 12000, rate_type: "Fixed", gst_rate: 0 }
    ]
  },
  ARCHITECTURE: {
    roles: [
      { name: "Architect", default_rate: 25000, rate_type: "Fixed" },
      { name: "Designer", default_rate: 18000, rate_type: "Fixed" },
      { name: "Civil Engineer", default_rate: 20000, rate_type: "Per Day" },
      { name: "Site Supervisor", default_rate: 12000, rate_type: "Per Day" },
      { name: "Draftsman", default_rate: 8000, rate_type: "Fixed" }
    ],
    services: [
      { name: "Architectural Planning", default_rate: 50000, rate_type: "Fixed", gst_rate: 0 },
      { name: "3D Visualization", default_rate: 20000, rate_type: "Fixed", gst_rate: 0 },
      { name: "Consultation", default_rate: 5000, rate_type: "Fixed", gst_rate: 0 }
    ]
  },
  OTHER: {
    roles: [],
    services: []
  }
};

// Return the presets for a category (empty arrays for OTHER / unknown).
export function getIndustryPresets(category) {
  return INDUSTRY_PRESETS[category] || INDUSTRY_PRESETS.OTHER;
}