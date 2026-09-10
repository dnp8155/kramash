import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { formatMoney } from "@/utils/format";

// Discount + GST + Summary — supports GST rate selection and CGST/SGST vs IGST mode.
export default function InvoiceFinancials({
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  gstApplicable,
  setGstApplicable,
  gstRate,
  setGstRate,
  gstMode,
  totals,
  currency,
  readOnly
}) {
  const gstRates = [0, 5, 12, 18, 28];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Left: Discount + GST */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Discount</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={discountValue || 0}
              onChange={(e) => setDiscountValue(e.target.value)}
              disabled={readOnly}
              className="flex-1"
              min="0"
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

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Enable GST</label>
            <Toggle
              checked={!!gstApplicable}
              onChange={(v) => !readOnly && setGstApplicable(v)}
              disabled={readOnly}
            />
          </div>
          {gstApplicable && (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">GST Rate</label>
              <div className="flex items-center gap-2">
                <Select
                  value={gstRates.includes(Number(gstRate)) ? String(gstRate) : "custom"}
                  onChange={(e) => {
                    if (e.target.value === "custom") return;
                    setGstRate(Number(e.target.value));
                  }}
                  disabled={readOnly}
                  className="flex-1"
                >
                  {gstRates.map((r) => (
                    <option key={r} value={String(r)}>{r}%</option>
                  ))}
                  {!gstRates.includes(Number(gstRate)) && Number(gstRate) > 0 && (
                    <option value="custom">{gstRate}% (custom)</option>
                  )}
                </Select>
                <Input
                  type="number"
                  value={gstRate || 0}
                  onChange={(e) => setGstRate(e.target.value)}
                  disabled={readOnly}
                  className="w-20"
                  min="0"
                  max="100"
                />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {gstMode === "igst" ? "Inter-state: IGST applies" : "Intra-state: CGST + SGST applies"}
              </div>
            </div>
          )}
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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxable Amount</span>
            <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.taxableAmount, currency)}</span>
          </div>
          {gstApplicable && Number(totals.gstTotal) > 0 && (
            <>
              {gstMode === "igst" ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST ({gstRate}%)</span>
                  <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.igstAmount, currency)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST ({(gstRate / 2).toFixed(1)}%)</span>
                    <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.cgstAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST ({(gstRate / 2).toFixed(1)}%)</span>
                    <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.sgstAmount, currency)}</span>
                  </div>
                </>
              )}
            </>
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