import { Clock, Activity, CheckCircle2, PauseCircle, Circle } from "lucide-react";

// Event lifecycle status configuration — labels, icons, and colors.
// Colors are data-driven: each status has fg (foreground) and bg (background) hex values
// so components can render dots/badges dynamically without hardcoding.
export const EVENT_STATUS = {
  upcoming: { label: "Upcoming", badge: "upcoming", dot: "bg-[#1e3a8a]", fg: "#1e3a8a", bg: "#dbeafe", icon: Clock },
  "in-progress": { label: "In Progress", badge: "progress", dot: "bg-[#f59e0b]", fg: "#b45309", bg: "#fef3c7", icon: Activity },
  completed: { label: "Completed", badge: "completed", dot: "bg-[#10b981]", fg: "#047857", bg: "#d1fae5", icon: CheckCircle2 },
  postponed: { label: "Postponed", badge: "postponed", dot: "bg-[#6b7280]", fg: "#4b5563", bg: "#f3f4f6", icon: PauseCircle },
  cancelled: { label: "Cancelled", badge: "cancelled", dot: "bg-[#ef4444]", fg: "#dc2626", bg: "#fee2e2", icon: Circle }
};

export const EVENT_STATUS_ORDER = ["upcoming", "in-progress", "completed", "postponed", "cancelled"];

export const TEAM_STATUS = {
  available: { label: "Available", dot: "bg-[#10b981]" },
  busy: { label: "Busy", dot: "bg-[#f59e0b]" },
  inactive: { label: "Inactive", dot: "bg-[#ef4444]" }
};

export const PAYMENT_METHODS = ["All", "Online", "Cash"];
export const PAYMENT_TYPES = ["All", "Received", "Paid"];

// Auto-calculate effective event status from dates and payment.
// Manual status (anything other than the default "upcoming") takes priority.
// When status is still "upcoming" (not manually changed), compute from dates + payment:
//   Client fully paid + event date arrived → Completed
//   Event date has started                  → In Progress
//   Event date is in future                 → Upcoming
export function getEffectiveEventStatus(event, clientPaidAmount = 0, clientTotalAmount = 0) {
  if (event?.status && event.status !== "upcoming") return event.status;

  const today = new Date().toISOString().slice(0, 10);
  const startDate = event?.start_date;
  const endDate = event?.end_date || event?.start_date;

  if (clientTotalAmount > 0 && clientPaidAmount >= clientTotalAmount && endDate && today >= endDate) {
    return "completed";
  }
  if (startDate && today >= startDate && today <= endDate) {
    return "in-progress";
  }
  return "upcoming";
}