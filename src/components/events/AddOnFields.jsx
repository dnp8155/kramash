import { formatEventDate, addOnDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { useT } from "@/hooks/useT";
import { usePaymentPreset } from "@/hooks/usePaymentPreset";

function Cell({ label, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

// An add-on shown the same way as a payment: Date, Type, Amount, Method, Particular (its name, plus notes).
// Used on the event's Payments and Financials tabs. Older add-ons without a date use the day they were added.
export default function AddOnFields({ item, currency }) {
  const t = useT();
  const pm = usePaymentPreset();
  const date = addOnDate(item);
  const particular = [item.name || t("Unnamed"), item.notes].filter(Boolean).join(" · ");
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      <Cell label={t("Date")}><div className="text-sm font-medium text-foreground">{date ? formatEventDate(date) : "—"}</div></Cell>
      <Cell label={t("Type")}><div className="text-sm font-semibold text-success">{t("Add-on")}</div></Cell>
      <Cell label={t("Amount")}><div className="text-sm font-semibold text-success tabular-nums">+{formatMoney(Number(item.amount) || 0, currency)}</div></Cell>
      <Cell label={t("Method")}><div className="text-sm font-medium text-foreground">{item.method ? pm.label(item.method) : "—"}</div></Cell>
      <Cell label={t("Particular")} className="col-span-2"><div className="text-sm font-medium text-foreground break-anywhere">{particular}</div></Cell>
    </div>
  );
}
