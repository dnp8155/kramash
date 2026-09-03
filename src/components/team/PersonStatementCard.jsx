import { Crown, Wallet, Users, Briefcase, TrendingUp, Clock } from "lucide-react";
import { formatMoney } from "@/utils/format";
import { cn } from "@/lib/utils";

// Consolidated per-person financial statement card.
// Shows Roles Total, Services Total, Total Paid, Due Now, and Future Amount Due
// across both Team/Role and Service Provider assignments.
//
// Responsive: works from 320px up. No horizontal overflow or text clipping.
export default function PersonStatementCard({ statement, currency = "INR" }) {
  const {
    name,
    member,
    rolesTotal = 0,
    servicesTotal = 0,
    combinedTotal = 0,
    totalPaid = 0,
    dueNow = 0,
    futureDue = 0
  } = statement;

  const hasTeam = rolesTotal > 0 || (member && statement.teamAssignments?.length > 0);
  const hasService = servicesTotal > 0 || statement.serviceAssignments?.length > 0;
  const isFullySettled = futureDue === 0 && combinedTotal > 0;
  const hasOverdue = dueNow > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-card-hover hover-lift transition-all">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Statement for
          </span>
          {member?.is_self && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-primary text-primary-foreground">
              <Crown className="w-2 h-2" /> Self
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-foreground mt-0.5 break-anywhere leading-tight">
          {name}
        </h3>
      </div>

      {/* Due Now — prominent */}
      <div
        className={cn(
          "rounded-lg px-3 py-2.5 border",
          hasOverdue
            ? "bg-warning/10 border-warning/20"
            : "bg-muted/40 border-border"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                hasOverdue ? "text-warning" : "text-muted-foreground"
              )}
            />
            <span className="text-xs font-medium text-muted-foreground truncate">
              Due Now (Till Now)
            </span>
          </div>
          <span
            className={cn(
              "text-lg font-bold tabular-nums whitespace-nowrap",
              hasOverdue ? "text-warning" : "text-foreground"
            )}
          >
            {formatMoney(dueNow, currency)}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Breakdown rows */}
      <div className="space-y-2">
        {hasTeam && (
          <StatementRow
            icon={Users}
            label="Team / Roles Total"
            amount={rolesTotal}
            currency={currency}
          />
        )}
        {hasService && (
          <StatementRow
            icon={Briefcase}
            label="Services Total"
            amount={servicesTotal}
            currency={currency}
          />
        )}
        <StatementRow
          icon={Wallet}
          label="Total Paid"
          amount={totalPaid}
          currency={currency}
          tone={totalPaid > 0 ? "success" : "neutral"}
        />
        <StatementRow
          icon={TrendingUp}
          label="Future Amount Due"
          amount={futureDue}
          currency={currency}
          tone={
            futureDue > 0 ? (hasOverdue ? "warning" : "foreground") : "success"
          }
          emphasize
        />
      </div>

      {/* Settled badge */}
      {isFullySettled && (
        <div className="text-xs font-medium text-success flex items-center gap-1 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Fully settled
        </div>
      )}
    </div>
  );
}

function StatementRow({ icon: Icon, label, amount, currency, tone = "neutral", emphasize = false }) {
  const toneClass = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    foreground: "text-foreground"
  }[tone];

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <span
        className={cn(
          "tabular-nums whitespace-nowrap",
          emphasize ? "text-sm font-bold" : "text-sm font-semibold",
          toneClass
        )}
      >
        {formatMoney(amount, currency)}
      </span>
    </div>
  );
}