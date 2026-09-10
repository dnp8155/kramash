// Phase 6 quotation configuration: service rate types, statuses, GST modes,
// default services seeded on workspace creation, and default terms.

export const SERVICE_RATE_TYPES = ["Fixed", "Per Day", "Per Unit"];

export const QUOTATION_STATUSES = ["draft", "finalized", "accepted", "rejected", "expired", "cancelled"];

export const QUOTATION_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  finalized: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", className: "bg-success/10 text-success" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  expired: { label: "Expired", className: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" }
};

export const DISCOUNT_TYPES = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount" }
];

export const GST_MODES = [
  { value: "cgst_sgst", label: "CGST + SGST (Same State)" },
  { value: "igst", label: "IGST (Inter-State)" }
];

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

// ---- Quotation Categories ----

export const QUOTATION_CATEGORIES = [
  { value: "PHOTOGRAPHY", label: "Photography / Videography" },
  { value: "EVENT_MANAGEMENT", label: "Event Management" },
  { value: "ARCHITECTURE", label: "Architecture / Interior Design" },
  { value: "OTHER", label: "Other Services" }
];

// ---- Dynamic Context Types per Category ----

export const EVENT_CONTEXT_TYPES = [
  { value: "bride_side", label: "Bride Side" },
  { value: "groom_side", label: "Groom Side" },
  { value: "common", label: "Common" },
  { value: "other", label: "Others" }
];

export const ARCHITECTURE_PROPERTY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "office", label: "Office" },
  { value: "renovation", label: "Renovation" },
  { value: "interior", label: "Interior" },
  { value: "other", label: "Other" }
];

// Context options grouped by category for dynamic UI rendering.
export const CONTEXT_OPTIONS_BY_CATEGORY = {
  PHOTOGRAPHY: EVENT_CONTEXT_TYPES,
  EVENT_MANAGEMENT: EVENT_CONTEXT_TYPES,
  ARCHITECTURE: ARCHITECTURE_PROPERTY_TYPES,
  OTHER: []
};

export const CONTEXT_LABEL_BY_CATEGORY = {
  PHOTOGRAPHY: "Side / Context",
  EVENT_MANAGEMENT: "Side / Context",
  ARCHITECTURE: "Property / Project Type",
  OTHER: "Context"
};

// ---- Member Type / Side options (for team assignments within a day) ----

export const MEMBER_TYPE_OPTIONS = [
  { value: "bride_side", label: "Bride Side" },
  { value: "groom_side", label: "Groom Side" },
  { value: "common", label: "Common" },
  { value: "other", label: "Others" }
];

// ---- Default services seeded for a new workspace. ----

export const DEFAULT_SERVICES = [
  { name: "Wedding Photography", default_rate: 30000, rate_type: "Fixed", gst_rate: 0 },
  { name: "Cinematography", default_rate: 25000, rate_type: "Fixed", gst_rate: 0 },
  { name: "Drone Coverage", default_rate: 8000, rate_type: "Fixed", gst_rate: 0 },
  { name: "Album", default_rate: 15000, rate_type: "Per Unit", gst_rate: 0 }
];

export const DEFAULT_QUOTATION_TERMS =
  "This quotation is valid for 30 days from the date of issue.\n" +
  "Payment Terms: 50% advance to confirm booking, balance on or before the event date.\n" +
  "Delivery timeline: 4-6 weeks post event.\n" +
  "Cancellation: Advance paid is non-refundable.";

export const DEFAULT_FOOTER_MESSAGE =
  "Thank you for choosing us. We look forward to making your day special!";