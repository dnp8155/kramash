// Category-aware default equipment checklists for the operational Job Sheet.
// Admins can override these per-event via job_sheet_config.equipment_items.
// Do NOT hardcode photography-only equipment — each category has its own list.

export const EQUIPMENT_DEFAULTS = {
  PHOTOGRAPHY_VIDEOGRAPHY: [
    "Camera Body",
    "Lenses",
    "Drone",
    "Lights",
    "Tripod",
    "Batteries",
    "Memory Cards",
    "Laptop",
  ],
  EVENT_MANAGEMENT: [
    "Walkie Talkies",
    "First Aid Kit",
    "Signage / Boards",
    "Stationery",
    "Power Strips",
    "Extension Cords",
    "Tool Kit",
  ],
  ARCHITECTURE_INTERIOR: [
    "Laser Measure",
    "Measuring Tape",
    "Tablet",
    "Site Documents",
    "Camera",
    "Tripod",
    "Laptop",
  ],
  OTHER: [
    "Camera",
    "Tripod",
    "Batteries",
    "Laptop",
  ],
};

export function getDefaultEquipment(category) {
  return EQUIPMENT_DEFAULTS[category] || EQUIPMENT_DEFAULTS.OTHER;
}