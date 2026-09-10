import { cn } from "@/lib/utils";

const statusConfig = {
  Draft: { cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  Due: { cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  "Partially Paid": { cls: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  Paid: { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  Overdue: { cls: "bg-red-50 text-red-700 border border-red-200", dot: "bg-red-500" },
  Cancelled: { cls: "bg-muted text-muted-foreground line-through", dot: "bg-muted-foreground" },
};

export default function InvoiceStatusBadge({ status, className }) {
  const config = statusConfig[status] || statusConfig.Draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", config.cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {status}
    </span>
  );
}