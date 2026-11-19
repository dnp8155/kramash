import { useState } from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Section } from "@/components/quotation/QuotationParts";
import { formatMoney } from "@/utils/format";
import { INCLUDES_MARK, isIncludeItem, lineTotal } from "@/lib/quotationCalc";
import { useT } from "@/hooks/useT";

// "Includes / Deliverables": what the package covers beyond the day-by-day schedule. Wording stays generic so it
// suits every business category. Each item has its own quantity and price (amount = quantity × rate), can be an add-on, and counts in the
// quotation total. Stored as ordinary quotation items marked with INCLUDES_MARK (no date), so totals, GST, discount
// and invoices pick them up without any special casing.
export default function QuotationIncludesSection({ items, setItems, services = [], currency, readOnly }) {
  const t = useT();
  const [pickId, setPickId] = useState("");

  const rows = items.map((it, idx) => ({ it, idx })).filter(({ it }) => isIncludeItem(it));
  if (readOnly && rows.length === 0) return null;

  const update = (idx, field, value) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, [field]: value } : x)));
  const remove = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const base = { day_date: "", phase_title: INCLUDES_MARK, quantity: 1, days: 1, rate_type: "Fixed", gst_rate: 0, sac_code: "", is_addon: false };
  const addService = (serviceId) => {
    const s = services.find((x) => x.id === serviceId);
    if (!s) return;
    setItems((prev) => [...prev, { ...base, item_type: "service", reference_id: s.id, name: s.name, description: s.description || "", unit_rate: s.default_rate || 0, gst_rate: s.gst_rate || 0, sac_code: s.sac_code || "" }]);
    setPickId("");
  };
  const addCustom = () => setItems((prev) => [...prev, { ...base, item_type: "custom", name: "", description: "", unit_rate: 0 }]);

  const subtotal = rows.reduce((s, { it }) => s + lineTotal(it), 0);

  return (
    <Section icon={Gift} title={t("Includes / Deliverables")}>
      <p className="text-xs text-muted-foreground mb-3">
        {t("What the package covers beyond the day-by-day schedule. Optional. Each item has its own quantity and price, and counts in the total. Tick Add-on for optional extras.")}
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-1">{t("No includes added.")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ it, idx }) => (
            <div key={idx} className="border border-border rounded-lg p-2.5 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <Input value={it.name || ""} onChange={(e) => update(idx, "name", e.target.value)} disabled={readOnly} placeholder={t("Item name")} className="flex-1 h-8 text-sm" />
                {!readOnly && (
                  <button type="button" onClick={() => remove(idx)} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground sm:hover:text-destructive sm:hover:bg-destructive/5 shrink-0" aria-label={t("Remove")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input value={it.description || ""} onChange={(e) => update(idx, "description", e.target.value)} disabled={readOnly} placeholder={t("Note (optional) — shown to the client next to this item")} className="h-8 text-xs" />
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase">{t("Qty")}</span>
                  <Input type="number" min="0" value={it.quantity} onChange={(e) => update(idx, "quantity", Number(e.target.value))} disabled={readOnly} className="h-7 w-16 text-xs text-right py-0" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase">{t("Rate")}</span>
                  <Input type="number" min="0" value={it.unit_rate} onChange={(e) => update(idx, "unit_rate", Number(e.target.value))} disabled={readOnly} className="h-7 w-28 text-xs text-right py-0" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase">{t("Amount")}</span>
                  <span className="text-sm font-medium tabular-nums h-7 flex items-center">{formatMoney(lineTotal(it), currency)}</span>
                </div>
                <label className={`flex items-center gap-1 text-xs text-muted-foreground ml-auto h-7 ${readOnly ? "" : "cursor-pointer"}`}>
                  <input type="checkbox" checked={!!it.is_addon} onChange={(e) => update(idx, "is_addon", e.target.checked)} disabled={readOnly} className="rounded" />
                  {t("Add-on")}
                </label>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-1">
            <span className="text-muted-foreground">{t("Includes total")}</span>
            <span className="font-semibold tabular-nums">{formatMoney(subtotal, currency)}</span>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <Select value={pickId} onChange={(e) => addService(e.target.value)} className="flex-1 min-w-[200px] h-8 text-xs">
            <option value="">{t("— Add from my services —")}</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.default_rate ? ` · ${formatMoney(s.default_rate, currency)}` : ""}</option>)}
          </Select>
          <Button size="sm" variant="outline" onClick={addCustom}><Plus className="w-3 h-3" />{t("Custom item")}</Button>
        </div>
      )}
    </Section>
  );
}
