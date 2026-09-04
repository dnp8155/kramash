import { AlertTriangle } from "lucide-react";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { formatMoney } from "@/utils/format";
import { GST_MODES } from "@/constants/quotationConfig";
import { Section, Field, Row } from "@/components/quotation/QuotationParts";

export default function QuotationPricingPanel({
  discountType, setDiscountType, discountValue, setDiscountValue,
  gstApplicable, setGstApplicable, gstMode, setGstMode,
  gstWorkspaceEnabled, workspaceGstin, totals, currency, readOnly,
  subtotals
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Discount & GST">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount Type">
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={readOnly} className="w-full">
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </Select>
          </Field>
          <Field label="Discount Value">
            <Input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={readOnly} />
          </Field>
        </div>

        {discountType === "fixed" && Number(discountValue) > totals.subtotal && (
          <p className="text-xs text-warning mt-1">Fixed discount exceeds subtotal — it will be clamped to {formatMoney(totals.subtotal, currency)}.</p>
        )}

        {gstWorkspaceEnabled && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Apply GST to this quotation</span>
              <Toggle checked={gstApplicable} onChange={setGstApplicable} label="Apply GST" />
            </div>
            {gstApplicable && (
              <Field label="GST Mode">
                <Select value={gstMode} onChange={(e) => setGstMode(e.target.value)} disabled={readOnly} className="w-full">
                  {GST_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </Field>
            )}
            {gstApplicable && !workspaceGstin && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Your workspace GSTIN is not set. Add it in Preferences before finalizing.
              </p>
            )}
          </div>
        )}
        {!gstWorkspaceEnabled && (
          <p className="text-xs text-muted-foreground mt-3">GST is not enabled for this workspace. Enable it in Preferences to use GST on quotations.</p>
        )}
      </Section>

      <Section title="Totals">
        <div className="space-y-1.5">
          {subtotals && subtotals.team > 0 && (
            <Row label="Team Subtotal" value={formatMoney(subtotals.team, currency)} />
          )}
          {subtotals && subtotals.service > 0 && (
            <Row label="Service Subtotal" value={formatMoney(subtotals.service, currency)} />
          )}
          {subtotals && subtotals.custom > 0 && (
            <Row label="Custom Items Subtotal" value={formatMoney(subtotals.custom, currency)} />
          )}
          {subtotals && (subtotals.team > 0 || subtotals.service > 0 || subtotals.custom > 0) && (
            <div className="border-t border-border/60 my-1" />
          )}
          <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
          {totals.discountAmount > 0 && (
            <Row label={`Discount (${discountType === "percent" ? discountValue + "%" : "Fixed"})`} value={"-" + formatMoney(totals.discountAmount, currency)} />
          )}
          <Row label="Taxable Amount" value={formatMoney(totals.taxableAmount, currency)} />
          {gstApplicable && gstMode === "cgst_sgst" && (
            <>
              <Row label="CGST" value={formatMoney(totals.cgstAmount, currency)} />
              <Row label="SGST" value={formatMoney(totals.sgstAmount, currency)} />
            </>
          )}
          {gstApplicable && gstMode === "igst" && (
            <Row label="IGST" value={formatMoney(totals.igstAmount, currency)} />
          )}
          <div className="flex justify-between text-sm py-2 mt-2 border-t border-border">
            <span className="font-semibold">Grand Total</span>
            <span className="font-bold text-primary">{formatMoney(totals.grandTotal, currency)}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}