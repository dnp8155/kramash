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

// Auto-calculate the effective event status from its dates and payments.
// Only "upcoming" and "in-progress" are auto-managed — completed, postponed and
// cancelled are deliberate choices and are never overridden.
//   Before the first event date            → Upcoming
//   From the first date onwards            → In Progress
//   After the last date AND fully settled  → Completed
// "Settled" = client paid in full and every external team member / service paid.
// settled: true | false | undefined (unknown yet — never completes on unknown).
export function getEffectiveEventStatus(event, settled) {
  const status = event?.status || "upcoming";
  if (status !== "upcoming" && status !== "in-progress") return status;

  const dates = (Array.isArray(event?.event_dates) && event.event_dates.length > 0
    ? event.event_dates
    : [event?.start_date, event?.end_date]
  ).filter(Boolean).sort();
  if (dates.length === 0) return status;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const first = dates[0].slice(0, 10);
  const last = dates[dates.length - 1].slice(0, 10);

  if (today > last && settled === true) return "completed";
  if (today > last && settled === undefined) return status;
  if (today >= first) return "in-progress";
  return "upcoming";
}
