import { formatCurrency } from "@/utils/format";

// Compact 3-column financial summary bar used at the top of Team and
// Services sections on the Event Detail page. Shows Total Rate, Total
// Payments, and Total Remaining for one category only (team OR services).
// Responsive from 320px — columns divide evenly, no horizontal overflow.
export default function FinancialSummaryBar({ totalRate, totalPayments, totalRemaining }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/30">
      <Cell label="Total Rate" value={formatCurrency(totalRate)} />
      <Cell
        label="Total Payments"
        value={formatCurrency(totalPayments)}
        valueClass="text-success"
      />
      <Cell
        label="Total Remaining"
        value={formatCurrency(totalRemaining)}
        valueClass={totalRemaining > 0 ? "text-warning" : "text-foreground"}
      />
    </div>
  );
}

function Cell({ label, value, valueClass = "text-foreground" }) {
  return (
    <div className="px-2 py-2.5 text-center sm:px-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-bold sm:text-base ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}