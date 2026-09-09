import { cn } from "@/lib/utils";

const statusStyles = {
  Confirmed: "bg-success/10 text-success border-success/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-success/10 text-success border-success/20",
  Active: "bg-success/10 text-success border-success/20",
  "On Leave": "bg-warning/10 text-warning border-warning/20",
  Invited: "bg-info/10 text-info border-info/20",
  Inactive: "bg-muted text-muted-foreground border-border",
  Received: "bg-success/10 text-success border-success/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  Paid: "bg-success/10 text-success border-success/20",
  "Partially Paid": "bg-warning/10 text-warning border-warning/20",
  Partial: "bg-warning/10 text-warning border-warning/20",
  Unpaid: "bg-muted text-muted-foreground border-border",
  Overpaid: "bg-info/10 text-info border-info/20",
  Void: "bg-muted text-muted-foreground border-border",
  Draft: "bg-muted text-muted-foreground border-border",
  Sent: "bg-info/10 text-info border-info/20",
  Accepted: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  Expired: "bg-muted text-muted-foreground border-border",
  default: "bg-muted text-muted-foreground border-border",
};

export default function StatusBadge({ status, className }) {
  const style = statusStyles[status] || statusStyles.default;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        style,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}