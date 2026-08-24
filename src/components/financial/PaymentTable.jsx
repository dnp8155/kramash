import { formatINR } from "@/utils/format";

export default function PaymentTable({ payments }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Description</span>
        <span>Date</span>
        <span>Source</span>
        <span className="text-right">Amount</span>
      </div>
      {payments.map((p) => (
        <div
          key={p.id}
          className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-1 sm:gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40"
        >
          <div>
            <div className="text-sm font-medium text-foreground">{p.description}</div>
            <div className="text-xs text-muted-foreground">{p.client}</div>
          </div>
          <div className="text-sm text-muted-foreground">{p.date}</div>
          <div className="text-sm text-muted-foreground">{p.source}</div>
          <div className="text-sm font-semibold text-success sm:text-right">
            +{formatINR(p.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}