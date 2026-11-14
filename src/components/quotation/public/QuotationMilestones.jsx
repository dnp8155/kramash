import PortalMilestoneCard from "@/components/portal/PortalMilestoneCard";
import { calculateMilestones } from "@/lib/quotationCalc";

const TIMING = { on_signing: "On signing", event_day: "On event day", day_after_event: "Day after event" };

// The quotation's payment schedule (before it's accepted) — same card as the client portal, minus the paid status.
// Once accepted, the page passes the live payment status to PortalMilestoneCard directly instead.
export default function QuotationMilestones({ milestones, grandTotal, currency }) {
  if (!milestones || milestones.length === 0) return null;
  const rows = calculateMilestones(milestones, grandTotal).map((m) => ({
    name: m.name || "Payment",
    amount: m.calculated_amount,
    timing: String(m.due_condition || "").trim() || TIMING[m.due_date_type] || "",
    due_date: m.due_date || "",
    pct: m.type === "percent" ? Number(m.value) || 0 : (grandTotal > 0 ? (m.calculated_amount / grandTotal) * 100 : 0),
  }));
  return <PortalMilestoneCard milestones={rows} grandTotal={grandTotal} currency={currency} showStatus={false} />;
}
