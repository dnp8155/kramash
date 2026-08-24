import { formatINR } from "@/utils/format";
import { cn } from "@/lib/utils";

export default function SummaryCard({ label, value, tone }) {
  const toneClass = {
    success: "text-success",
    destructive: "text-destructive"
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("mt-1 text-xl font-semibold", toneClass[tone] || "text-foreground")}>
        {formatINR(value)}
      </div>
    </div>
  );
}