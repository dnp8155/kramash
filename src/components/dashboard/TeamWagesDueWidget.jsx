import { useState } from "react";
import { Wallet, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { formatMoney, getInitials } from "@/utils/format";
import EmptyState from "@/components/common/EmptyState";
import { useT } from "@/hooks/useT";

const HIDE_KEY = "kramasha:hideWageAmounts";
const readHidden = () => { try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; } };

export default function TeamWagesDueWidget({ dues = [], totalDue = 0, currency = "INR", isLoading, onSeeAll }) {
  const t = useT();
  // Hides only the per-person amounts; the total stays visible.
  const [hideAmounts, setHideAmounts] = useState(readHidden);

  return (
    <div className="bg-card border border-border rounded-[15px] shadow-card h-full">
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
              <div key={i} className="h-9 rounded-md bg-muted/50 skeleton-shimmer" />
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
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                {t("Who you owe")}
                <button
                  type="button"
                  onClick={() => setHideAmounts((v) => {
                    try { localStorage.setItem(HIDE_KEY, v ? "0" : "1"); } catch { /* private mode: just not remembered */ }
                    return !v;
                  })}
                  className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={hideAmounts ? t("Show amounts") : t("Hide amounts")}
                  aria-pressed={hideAmounts}
                  title={hideAmounts ? t("Show amounts") : t("Hide amounts")}
                >
                  {hideAmounts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </span>
              <span className="text-lg font-bold text-warning tabular-nums">{formatMoney(totalDue, currency)}</span>
            </div>
            <div className="space-y-1">
              {dues.slice(0, 5).map(({ member, due }) => (
                <div key={member.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-warning">
                        {getInitials(member.name, 1)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{hideAmounts ? "••••" : formatMoney(due, currency)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}