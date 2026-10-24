import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import Button from "@/components/common/Button";
import ProTag from "@/components/common/ProTag";
import { Crown, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function BillingSection() {
  const { plan } = usePlan();
  const navigate = useNavigate();
  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  // Expiry reads orange, and red once it is within a week — same as the Your Plan page.
  const daysLeft = plan?.expiresAt ? Math.ceil((new Date(plan.expiresAt) - Date.now()) / 86400000) : null;
  const expiryTone = !isPro || (daysLeft !== null && daysLeft <= 7) ? "text-destructive" : "text-warning";

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Billing & Plan</h3>
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div>
            {isPro
              ? <ProTag>Pro</ProTag>
              : <span className="inline-block align-middle text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Free</span>}
          </div>
          <div className="text-xs mt-1">
            {isPro
              ? <span className="inline-flex items-center gap-1 text-success font-medium"><CheckCircle2 className="w-3 h-3" /> Active</span>
              : plan?.isExpired
                ? <span className="text-destructive font-medium">Pro expired, Free limits apply</span>
                : <span className="text-muted-foreground">Free tier</span>}
          </div>
          {plan?.expiresAt && (isPro || plan?.isExpired) && (
            <div className={cn("text-xs font-medium mt-0.5", expiryTone)}>{isPro ? "Expires" : "Expired"} {formatDate(String(plan.expiresAt).slice(0, 10))}</div>
          )}
        </div>
      </div>
      <Button variant="outline" onClick={() => navigate("/plan")}>
        Manage Plan <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
