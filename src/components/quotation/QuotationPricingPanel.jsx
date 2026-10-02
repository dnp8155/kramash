import { AlertTriangle } from "lucide-react";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { formatMoney } from "@/utils/format";
import { round2 } from "@/lib/quotationCalc";
import { GST_MODES } from "@/constants/quotationConfig";
import { Section, Row } from "@/components/quotation/QuotationParts";
import { useT } from "@/hooks/useT";

export default function QuotationPricingPanel({
  discountType, setDiscountType, discountValue, setDiscountValue,
  finalTotal, setFinalTotal,
  gstApplicable, setGstApplicable, gstMode, setGstMode,
  gstWorkspaceEnabled, workspaceGstin, totals, currency, readOnly,
  subtotals
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold">{t("Discount & GST")}</h3>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{t("Discount")}</label>
          <div className="flex items-center gap-2">
            <Input type="number" min="0" value={discountValue || 0} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={readOnly} className="flex-1" />
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={readOnly} className="w-20">
              <option value="percent">%</option>
              <option value="fixed">₹</option>
            </Select>
          </div>
          {discountType === "fixed" && Number(discountValue) > totals.subtotal && (
            <p className="text-xs text-warning mt-1">{t("Fixed discount exceeds subtotal — it will be clamped to")} {formatMoney(totals.subtotal, currency)}.</p>
          )}
        </div>

        {gstWorkspaceEnabled && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("Apply GST to this quotation")}</span>
              <Toggle checked={gstApplicable} onChange={setGstApplicable} disabled={readOnly} label={t("Apply GST")} />
            </div>
            {gstApplicable && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{t("GST Mode")}</label>
                <Select value={gstMode} onChange={(e) => setGstMode(e.target.value)} disabled={readOnly} className="w-full">
                  {GST_MODES.map((m) => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
                </Select>
              </div>
            )}
            {gstApplicable && !workspaceGstin && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {t("Your workspace GSTIN is not set. Add it in Preferences before finalizing.")}
              </p>
            )}
          </div>
        )}
        {!gstWorkspaceEnabled && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">{t("GST is not enabled for this workspace. Enable it in Preferences to use GST on quotations.")}</p>
        )}
      </div>

      <Section title={t("Totals")}>
        <div className="space-y-1.5">
          {subtotals && subtotals.team > 0 && (
            <Row label={t("Team Subtotal")} value={formatMoney(subtotals.team, currency)} />
          )}
          {subtotals && subtotals.service > 0 && (
            <Row label={t("Service Subtotal")} value={formatMoney(subtotals.service, currency)} />
          )}
          {subtotals && subtotals.custom > 0 && (
            <Row label={t("Custom Items Subtotal")} value={formatMoney(subtotals.custom, currency)} />
          )}
          {subtotals && (subtotals.team > 0 || subtotals.service > 0 || subtotals.custom > 0) && (
            <div className="border-t border-border/60 my-1" />
          )}
          <Row label={t("Subtotal")} value={formatMoney(totals.subtotal, currency)} />
          {totals.discountAmount > 0 && (
            <Row label={`${t("Discount")} (${discountType === "percent" ? discountValue + "%" : t("Fixed")})`} value={"-" + formatMoney(totals.discountAmount, currency)} />
          )}
          <Row label={t("Taxable Amount")} value={formatMoney(totals.taxableAmount, currency)} />
          {gstApplicable && gstMode === "cgst_sgst" && (
            <>
              <Row label="CGST" value={formatMoney(totals.cgstAmount, currency)} />
              <Row label="SGST" value={formatMoney(totals.sgstAmount, currency)} />
            </>
          )}
          {gstApplicable && gstMode === "igst" && (
            <Row label="IGST" value={formatMoney(totals.igstAmount, currency)} />
          )}
          {Number(totals.adjustmentAmount) !== 0 && (
            <Row label={t("Round off / Adjustment")} value={(totals.adjustmentAmount > 0 ? "+" : "-") + formatMoney(Math.abs(totals.adjustmentAmount), currency)} />
          )}
          <div className="pt-2 mt-1 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-muted-foreground">{t("Set final total (manual)")}</label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" placeholder={String(round2(totals.grandTotal - (totals.adjustmentAmount || 0)))} value={finalTotal ?? ""} onChange={(e) => setFinalTotal(e.target.value)} disabled={readOnly} className="w-36 text-right" />
                {finalTotal !== "" && finalTotal != null && !readOnly && (
                  <button type="button" onClick={() => setFinalTotal("")} className="text-xs text-primary underline shrink-0">{t("Reset")}</button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("Type the amount you want to charge (e.g. to match the contract value). The difference appears as a round-off / adjustment line.")}</p>
          </div>
          <div className="flex justify-between text-sm py-2 mt-2 border-t border-border">
            <span className="font-semibold">{t("Grand Total")}</span>
            <span className="font-bold text-primary">{formatMoney(totals.grandTotal, currency)}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}