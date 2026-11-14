import { useMemo } from "react";
import { Users, Package, FileText, ListChecks } from "lucide-react";
import { Section } from "@/components/quotation/QuotationParts";
import { formatMoney } from "@/utils/format";
import DateChip from "@/components/common/DateChip";
import { lineTotal, isIncludeItem, isRoleOnlyItem } from "@/lib/quotationCalc";
import { useT } from "@/hooks/useT";

// Read-only check of what the quotation holds: team (role, name, side), services, custom items and
// deliverables, each with its amount — by date in day-wise mode, one list otherwise. Edit in the builder above.
export default function QuotationTeamServicesReview({ items, mode, currency }) {
  const t = useT();

  const { groups, deliverables } = useMemo(() => {
    const map = new Map();
    const inc = [];
    for (const it of items) {
      if (isIncludeItem(it)) { inc.push(it); continue; }
      const key = mode === "day_wise" ? (it.day_date || "") : "all";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
    return { groups: sorted, deliverables: inc };
  }, [items, mode]);

  if (groups.length === 0 && deliverables.length === 0) return null;

  return (
    <Section title={mode === "day_wise" ? t("Team, Services & Items — by date") : t("Team, Services & Items")}>
      <p className="text-xs text-muted-foreground -mt-1">{t("A read-only summary of what the PDF lists. Make changes in the builder above.")}</p>
      <div className="space-y-3">
        {groups.map(([key, rows]) => {
          const team = rows.filter((it) => it.item_type === "team");
          const services = rows.filter((it) => it.item_type === "service");
          const custom = rows.filter((it) => it.item_type !== "team" && it.item_type !== "service");
          const subtotal = rows.reduce((s, it) => s + lineTotal(it), 0);
          return (
            <div key={key} className="border border-border rounded-lg overflow-hidden">
              {mode === "day_wise" && (
                <div className="flex items-center justify-between bg-muted/30 px-3 py-2 border-b border-border">
                  {key ? <DateChip date={key} /> : <span className="text-xs font-medium text-muted-foreground">{t("Other items")}</span>}
                  <span className="text-xs font-semibold tabular-nums">{formatMoney(subtotal, currency)}</span>
                </div>
              )}
              <div className="p-3 space-y-3">
                <List icon={Users} title={t("Team")} rows={team} currency={currency}
                  primary={(it) => it.description || it.name || t("Team member")}
                  secondary={(it) => it.team_member_name_snapshot || (isRoleOnlyItem(it) ? t("Member not selected") : "")}
                  side={(it) => it.member_type} />
                <List icon={Package} title={t("Services")} rows={services} currency={currency}
                  primary={(it) => it.name || t("Service")} secondary={(it) => (it.is_addon ? t("Add-on") : "")} />
                <List icon={FileText} title={t("Custom items")} rows={custom} currency={currency}
                  primary={(it) => it.name || t("Item")} secondary={(it) => it.description} />
              </div>
            </div>
          );
        })}
        {deliverables.length > 0 && (
          <div className="border border-border rounded-lg p-3">
            <List icon={ListChecks} title={t("Deliverables")} rows={deliverables} currency={currency}
              primary={(it) => `${Number(it.quantity) > 1 ? `${it.quantity} × ` : ""}${it.name || t("Item")}`}
              secondary={(it) => (it.is_addon ? t("Add-on") : it.description)} />
          </div>
        )}
      </div>
    </Section>
  );
}

function List({ icon: Icon, title, rows, currency, primary, secondary, side }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <div className="divide-y divide-border/60">
        {rows.map((it, i) => {
          const sub = secondary?.(it);
          const sd = side?.(it);
          return (
            <div key={i} className="flex items-start justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {primary(it)}
                  {sd && <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground align-middle">{sd}</span>}
                </div>
                {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
              </div>
              <span className="text-sm font-medium tabular-nums shrink-0">{formatMoney(lineTotal(it), currency)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
