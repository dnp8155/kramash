import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePlan } from "@/hooks/usePlan";
import Button from "@/components/common/Button";
import ProTag from "@/components/common/ProTag";
import { Crown, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { planValidity } from "@/lib/planValidity";
import { cn } from "@/lib/utils";

const CYCLES = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
// Same colours as the Plan validity section on Your Plan: green, amber from 7 days, red in the last 2 days / ended.
const TONES = {
  ok: { text: "text-success", bar: "bg-success" },
  soon: { text: "text-warning", bar: "bg-warning" },
  urgent: { text: "text-destructive", bar: "bg-destructive" },
  expired: { text: "text-destructive", bar: "bg-destructive" },
};

// Preferences → Billing & Plan: a short version of Your Plan (plan, days left, end date), with a link to manage it.
export default function BillingSection() {
  const { plan } = usePlan();
  const navigate = useNavigate();
  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  const isSuspended = plan?.planStatus === "suspended";
  const v = plan?.subscription && !isSuspended ? planValidity(plan.subscription) : null;
  const tone = v ? TONES[v.tone] : null;
  const renewSoon = v && (v.expired || v.daysLeft <= 10);

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Billing & Plan</h3>
      <div className="p-4 rounded-lg bg-muted/40 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div>
              {isPro
                ? <ProTag>Pro</ProTag>
                : <span className="inline-block align-middle text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Free</span>}
              {v && CYCLES[v.cycle] && isPro && <span className="ml-2 text-xs text-muted-foreground align-middle">{CYCLES[v.cycle]} · {v.source}</span>}
            </div>
            <div className="text-xs mt-1">
              {isPro
                ? <span className="inline-flex items-center gap-1 text-success font-medium"><CheckCircle2 className="w-3 h-3" /> Active</span>
                : isSuspended
                  ? <span className="text-destructive font-medium">Workspace suspended</span>
                  : plan?.isExpired
                    ? <span className="text-destructive font-medium">Pro ended, Free limits apply</span>
                    : <span className="text-muted-foreground">Free tier</span>}
            </div>
          </div>
          {v && <div className={cn("text-right text-sm font-bold tabular-nums shrink-0", tone.text)}>{v.headline}</div>}
        </div>

        {v && (
          <div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.usedPercent} aria-label="Part of the plan period used">
              <motion.div className={cn("h-full rounded-full", tone.bar)} initial={{ width: 0 }} animate={{ width: `${v.usedPercent}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
            </div>
            <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-muted-foreground tabular-nums">
              <span>Started {formatDate(v.startedAt)}</span>
              <span>{v.expired ? "Ended" : "Valid until"} {formatDate(v.expiresAt)}</span>
            </div>
          </div>
        )}
      </div>
      <Button variant={renewSoon ? "primary" : "outline"} onClick={() => navigate("/plan")}>
        {renewSoon ? "Renew Pro" : "Manage Plan"} <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
