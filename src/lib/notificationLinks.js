// Where a notification goes when it is tapped — one map for the bell (in-app). Push notifications carry their own
// `url` (set by the server, same destinations: see urlFor in supabase/functions/generateNotifications), and the
// service worker opens it (public/sw.js → notificationclick).
//
// Rules:
// - Open the exact item when there is one (event, client, quotation, invoice, team member, lead…).
// - "… deleted" activity rows point at the list instead, since the item itself is gone.
// - Items that live inside another page open that page on the right spot (milestone → its event's Milestones tab,
//   job sheet → its event's job sheet, support ticket → Help → My Tickets).
// - Unknown types fall back to the Dashboard, so a tap always goes somewhere.
import { base44 } from "@/api/base44Client";

const LIST_FOR = {
  events: "/events", event: "/events",
  clients: "/clients",
  leads: "/leads",
  quotations: "/quotation", quotation: "/quotation",
  invoices: "/invoices",
  team_members: "/team",
  services: "/rate-estimator",
  financial_transactions: "/financial", payment_milestones: "/financial", milestone: "/financial",
  expense_categories: "/financial", financial_years: "/financial",
  team_block_dates: "/team", team_roles: "/team", service_providers: "/team",
  job_sheets: "/events",
  subscription: "/plan",
  outside_work: "/outside-work",
  support_ticket: "/help?tab=tickets",
};

const isDeleted = (n) => / deleted$/i.test(String(n?.title || "").trim());

// The page for a notification without looking anything up. Returns a path, always.
export function notificationPath(n) {
  const type = String(n?.related_entity_type || "");
  const id = n?.related_entity_id ? String(n.related_entity_id) : "";
  if (!type) return LEGACY_TYPE_PATH[n?.type] || "/dashboard";
  if (isDeleted(n) || !id) return LIST_FOR[type] || "/dashboard";
  switch (type) {
    case "events": case "event": return `/events/${id}`;
    case "clients": return `/clients/${id}`;
    case "leads": return `/leads?lead=${encodeURIComponent(id)}`;
    case "quotations": case "quotation": return `/quotation/${id}`;
    case "invoices": return `/invoices/${id}`;
    case "team_members": return `/team/${id}`;
    default: return LIST_FOR[type] || "/dashboard";
  }
}

// Older rows saved before related_entity_type was filled in.
const LEGACY_TYPE_PATH = { event_reminder: "/events", payment_due: "/financial", lead_followup: "/leads", quotation_accepted: "/quotation" };

// Same as notificationPath, but for items that live inside an event it looks up the event first, so the tap lands on
// that event (falls back to the plain path if the lookup fails or the row is gone).
export async function resolveNotificationPath(n) {
  const plain = notificationPath(n);
  const type = String(n?.related_entity_type || "");
  const id = n?.related_entity_id;
  if (!id || isDeleted(n)) return plain;
  try {
    if (type === "milestone" || type === "payment_milestones") {
      const ms = await base44.entities.PaymentMilestone.get(id);
      if (ms?.event_id) return `/events/${ms.event_id}?tab=Milestones`;
    } else if (type === "job_sheets") {
      const js = await base44.entities.JobSheet.get(id);
      if (js?.event_id) return `/events/${js.event_id}/job-sheet`;
    }
  } catch { /* fall back to the plain page */ }
  return plain;
}
