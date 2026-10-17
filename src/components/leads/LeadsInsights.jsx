import { computeLeadInsights } from "@/lib/leadManager";
import { STATUS_STYLES, SOURCE_STYLES, LOST_REASONS } from "@/constants/leadConfig";
import { useT } from "@/hooks/useT";
import StatCard from "@/components/common/StatCard";
import { Percent, TrendingUp, XCircle, Filter } from "lucide-react";

const BAR = { new: "bg-blue-500", contacted: "bg-purple-500", qualified: "bg-cyan-500", negotiation: "bg-amber-500", won: "bg-success", lost: "bg-destructive" };

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] shadow-card">
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Bar({ label, value, max, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0}%` }} />
      </div>
    </div>
  );
}

// Pipeline summary: how many leads sit in each stage, how many convert, why leads are lost, and which sources work.
export default function LeadsInsights({ leads }) {
  const t = useT();
  const r = computeLeadInsights(leads);
  const maxStage = Math.max(1, ...r.stages.map((s) => s.count));
  const maxReason = Math.max(1, ...r.lostReasons.map((x) => x.count));
  const reasonLabel = (k) => (k === "unspecified" ? t("No reason given") : t(LOST_REASONS.find((x) => x.value === k)?.label || k));

  return (
    <div className="space-y-4">
      {/* Total / Active / Hot / Won already sit at the top of the page, so only the numbers that are new are shown here. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("Conversion rate")} value={r.conversionRate === null ? "—" : `${r.conversionRate}%`} icon={Percent} tone="primary" />
        <StatCard label={t("Lost")} value={r.lost} icon={XCircle} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card icon={Filter} title={t("Pipeline")}>
          <div className="space-y-3">
            {r.stages.map((s) => <Bar key={s.status} label={t(STATUS_STYLES[s.status].label)} value={s.count} max={maxStage} color={BAR[s.status]} />)}
          </div>
        </Card>

        <Card icon={XCircle} title={t("Why leads were lost")}>
          {r.lostReasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No lost leads yet.")}</p>
          ) : (
            <div className="space-y-3">
              {r.lostReasons.map((x) => <Bar key={x.reason} label={reasonLabel(x.reason)} value={x.count} max={maxReason} color="bg-destructive/80" />)}
            </div>
          )}
        </Card>
      </div>

      <Card icon={TrendingUp} title={t("Where leads come from")}>
        {r.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No leads yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1.5 font-medium">{t("Source")}</th><th className="py-1.5 font-medium text-right">{t("Leads")}</th><th className="py-1.5 font-medium text-right">{t("Won")}</th><th className="py-1.5 font-medium text-right">{t("Win rate")}</th></tr></thead>
              <tbody>
                {r.sources.map((s) => (
                  <tr key={s.source} className="border-t border-border">
                    <td className="py-2">{t(SOURCE_STYLES[s.source]?.label || s.source)}</td>
                    <td className="py-2 text-right tabular-nums">{s.total}</td>
                    <td className="py-2 text-right tabular-nums">{s.won}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{Math.round((s.won / s.total) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
