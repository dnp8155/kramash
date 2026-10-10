import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { formatMoney } from "@/utils/format";
import { GST_MODES } from "@/constants/quotationConfig";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function InvoiceFinancials({
  discountType, setDiscountType,
  discountValue, setDiscountValue,
  finalTotal, setFinalTotal,
  gstApplicable, setGstApplicable,
  gstRate, setGstRate,
  gstMode, setGstMode, gstWorkspaceEnabled, workspaceGstin,
  totals, currency, readOnly
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold">{t("Discount & GST")}</h3>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{t("Discount")}</label>
          <div className="flex items-center gap-2">
            <Input type="number" value={discountValue || 0} onChange={(e) => setDiscountValue(e.target.value)} disabled={readOnly} className="flex-1" min="0" />
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={readOnly} className="w-20">
              <option value="percent">%</option>
              <option value="fixed">₹</option>
            </Select>
          </div>
        </div>

        {(gstWorkspaceEnabled || gstApplicable) && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("Apply GST to this invoice")}</span>
              <Toggle checked={!!gstApplicable} onChange={(v) => !readOnly && setGstApplicable(v)} disabled={readOnly} label={t("Apply GST")} />
            </div>
            {gstApplicable && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{t("GST Mode")}</label>
                  <Select value={gstMode} onChange={(e) => setGstMode(e.target.value)} disabled={readOnly} className="w-full">
                    {GST_MODES.map((m) => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{t("GST Rate (%)")}</label>
                  <Input type="number" value={gstRate || 0} onChange={(e) => setGstRate(e.target.value)} disabled={readOnly} min="0" max="100" />
                </div>
                {!workspaceGstin && (
                  <p className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {t("Your workspace GSTIN is not set. Add it in Preferences before issuing.")}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {!gstWorkspaceEnabled && !gstApplicable && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">{t("GST is not enabled for this workspace. Enable it in Preferences to use GST on invoices.")}</p>
        )}
      </div>

      <div className="bg-secondary/60 border border-border rounded-xl p-4">
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("Subtotal")}</span>
            <span className="font-medium text-foreground tabular-nums">{formatMoney(totals.subtotal, currency)}</span>
          </div>
          {Number(totals.adjustmentAmount) !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Round off / Adjustment")}</span>
              <span className="font-medium text-foreground tabular-nums">{totals.adjustmentAmount > 0 ? "+" : "−"}{formatMoney(Math.abs(totals.adjustmentAmount), currency)}</span>
            </div>
          )}
          {Number(totals.discountAmount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Discount")}</span>
              <span className="font-medium text-destructive tabular-nums">−{formatMoney(totals.discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("Taxable Amount")}</span>
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
          <div className="pt-2 mt-1 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-muted-foreground">{t("Set subtotal (manual)")}</label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" placeholder={String(totals.subtotal)} value={finalTotal ?? ""} onChange={(e) => setFinalTotal(e.target.value)} disabled={readOnly} className="w-36 text-right" />
                {finalTotal !== "" && finalTotal != null && !readOnly && (
                  <button type="button" onClick={() => setFinalTotal("")} className="text-xs text-primary underline shrink-0">{t("Reset")}</button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("Type the amount to charge before discount (items + your margin). Discount and GST apply on it. Clients see it as the Subtotal — the margin is never shown as a line.")}</p>
          </div>
          <div className="flex justify-between text-base pt-2 border-t border-border">
            <span className="font-semibold text-foreground">{t("Total Due")}</span>
            <span className="font-bold text-foreground tabular-nums">{formatMoney(totals.grandTotal, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}