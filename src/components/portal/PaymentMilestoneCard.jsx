import { Wallet, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/utils/format";

export default function PaymentMilestoneCard({ paymentSummary }) {
  const { total_payable, total_paid, balance, has_payments } = paymentSummary;

  // Show actual milestone state — never mark "Paid" unless a real payment exists
  const advancePaid = has_payments && total_paid > 0;
  const advanceDue = !advancePaid && total_payable > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Payment Status
        </h3>
      </div>

      <div className="mt-4 space-y-3">
        {advanceDue && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Advance Due</p>
                <p className="text-xs text-amber-700">Pending</p>
              </div>
            </div>
            <p className="text-lg font-bold text-amber-900">{formatCurrency(total_payable)}</p>
          </div>
        )}

        {advancePaid && balance > 0 && (
          <>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Advance</p>
                  <p className="text-xs text-emerald-700">Paid</p>
                </div>
              </div>
              <p className="text-lg font-bold text-emerald-900">{formatCurrency(total_paid)}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Balance Due</p>
                  <p className="text-xs text-amber-700">Pending</p>
                </div>
              </div>
              <p className="text-lg font-bold text-amber-900">{formatCurrency(balance)}</p>
            </div>
          </>
        )}

        {advancePaid && balance <= 0 && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Fully Paid</p>
                <p className="text-xs text-emerald-700">Thank you</p>
              </div>
            </div>
            <p className="text-lg font-bold text-emerald-900">{formatCurrency(total_paid)}</p>
          </div>
        )}

        {!advanceDue && !advancePaid && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Payment details will appear here once confirmed.
          </p>
        )}
      </div>
    </div>
  );
}