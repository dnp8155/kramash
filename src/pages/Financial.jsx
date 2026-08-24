import { useState } from "react";
import SummaryCard from "@/components/financial/SummaryCard";
import PaymentTable from "@/components/financial/PaymentTable";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { paymentSummary, payments, financialYear } from "@/data/mockPayments";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/constants/statusConfig";
import { formatINR } from "@/utils/format";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["Payment Activity", "Financial Years"];

export default function Financial() {
  const [tab, setTab] = useState("Payment Activity");
  const [method, setMethod] = useState("All");
  const [type, setType] = useState("All");

  const filtered = payments.filter((p) => {
    const methodOk =
      method === "All" ||
      (method === "Online" && (p.source === "UPI" || p.source === "BANK TRANSFER")) ||
      (method === "Cash" && p.source === "CASH");
    const typeOk = type === "All" || p.type === type.toLowerCase();
    return methodOk && typeOk;
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Payment Activity" && (
        <>
          {/* Showing / export */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Showing</span>
            <Select defaultValue="fy" size="sm">
              <option value="fy">{financialYear}</option>
            </Select>
            <Button variant="outline" size="sm" className="ml-auto">
              <Download className="w-3.5 h-3.5" />
              Export to Excel
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label="Received" value={paymentSummary.received} tone="success" />
            <SummaryCard label="Paid" value={paymentSummary.paid} tone="destructive" />
            <SummaryCard label="Profit" value={paymentSummary.profit} tone="success" />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Online</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rcvd</span>
                <span className="font-medium text-success">{formatINR(paymentSummary.online.received)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-destructive">{formatINR(paymentSummary.online.paid)}</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cash</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rcvd</span>
                <span className="font-medium text-success">{formatINR(paymentSummary.cash.received)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-destructive">{formatINR(paymentSummary.cash.paid)}</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Method</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      method === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Type</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                {PAYMENT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PaymentTable payments={filtered} />
        </>
      )}

      {tab === "Financial Years" && (
        <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          Financial year breakdown coming soon.
        </div>
      )}
    </div>
  );
}