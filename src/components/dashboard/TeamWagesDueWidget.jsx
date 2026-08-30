import { Wallet, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/utils/format";
import EmptyState from "@/components/common/EmptyState";
import { useT } from "@/hooks/useT";

export default function TeamWagesDueWidget({ dues = [], totalDue = 0, currency = "INR", isLoading, onSeeAll }) {
  const t = useT();

  return (
    <div className="bg-card border border-border rounded-xl shadow-card h-full">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">{t("Team Wages Due")}</h3>
        </div>
        <button onClick={onSeeAll} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          {t("Team")} <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : totalDue <= 0 ? (
          <div className="py-4">
            <EmptyState
              title="All wages paid"
              description="No outstanding team payments."
              action={
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                  <CheckCircle2 className="w-4 h-4" /> {t("All settled")}
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between pb-2 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">{t("Who you owe")}</span>
              <span className="text-lg font-bold text-warning tabular-nums">{formatMoney(totalDue, currency)}</span>
            </div>
            <div className="space-y-1">
              {dues.slice(0, 5).map(({ member, due }) => (
                <div key={member.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-warning">
                        {(member.name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{formatMoney(due, currency)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}