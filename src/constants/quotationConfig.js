// Phase 6 quotation configuration: service rate types, statuses, GST modes,
// default services seeded on workspace creation, and default terms.

export const SERVICE_RATE_TYPES = ["Fixed", "Per Day", "Per Unit"];

export const QUOTATION_STATUSES = ["draft", "finalized", "accepted", "rejected"];

export const QUOTATION_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  finalized: { label: "Finalized", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", className: "bg-success/10 text-success" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" }
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

// Default services seeded for a new workspace.
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