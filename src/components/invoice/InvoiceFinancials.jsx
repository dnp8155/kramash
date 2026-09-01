import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { formatMoney } from "@/utils/format";

// Discount + GST + Summary — matches the reference design layout.
export default function InvoiceFinancials({
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  gstApplicable,
  setGstApplicable,
  gstRate,
  setGstRate,
  totals,
  currency,
  readOnly
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Left: Discount + GST */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Discount</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={discountValue || 0}
              onChange={(e) => setDiscountValue(e.target.value)}
              disabled={readOnly}
              className="flex-1"
            />
            <Select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              disabled={readOnly}
              className="w-20"
            >
              <option value="percent">%</option>
              <option value="fixed">₹</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">GST %</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={gstRate || 0}
              onChange={(e) => setGstRate(e.target.value)}
              disabled={readOnly}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => !readOnly && setGstApplicable(!gstApplicable)}
              disabled={readOnly}
              className={`px-3 h-9 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                gstApplicable
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {gstApplicable ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Summary */}
      <div className="bg-secondary/60 border border-border rounded-lg p-4">
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.subtotal, currency)}</span>
          </div>
          {Number(totals.discountAmount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-destructive tabular-nums">−{formatMoney(totals.discountAmount, currency)}</span>
            </div>
          )}
          {gstApplicable && Number(totals.gstTotal) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST</span>
              <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.gstTotal, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-border">
            <span className="font-semibold text-foreground">Total Due</span>
            <span className="font-bold text-foreground tabular-nums">{formatMoney(totals.grandTotal, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}