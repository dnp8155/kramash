export const EVENT_STATUS = {
  upcoming: { label: "Upcoming", badge: "upcoming", dot: "bg-[#3b82f6]" },
  "in-progress": { label: "In progress", badge: "progress", dot: "bg-[#f59e0b]" },
  completed: { label: "Completed", badge: "completed", dot: "bg-[#10b981]" },
  cancelled: { label: "Cancelled", badge: "cancelled", dot: "bg-[#ef4444]" }
};

export const EVENT_STATUS_ORDER = ["upcoming", "in-progress", "completed", "cancelled"];

export const TEAM_STATUS = {
  available: { label: "Available", dot: "bg-[#10b981]" },
  busy: { label: "Busy", dot: "bg-[#f59e0b]" },
  inactive: { label: "Inactive", dot: "bg-[#ef4444]" }
};

export const PAYMENT_METHODS = ["All", "Online", "Cash"];
export const PAYMENT_TYPES = ["All", "Received", "Paid"];