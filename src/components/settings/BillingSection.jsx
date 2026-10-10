import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import Button from "@/components/common/Button";
import { Crown, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/dates";

export default function BillingSection() {
  const { plan } = usePlan();
  const navigate = useNavigate();
  const isPro = plan?.planCode === "PRO" && !plan?.isExpired;
  const planName = isPro ? "Pro" : "Free";

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Billing & Plan</h3>
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{planName}</div>
          <div className="text-xs text-muted-foreground">{isPro ? "Active subscription" : plan?.isExpired ? "Pro expired, Free limits apply" : "Free tier"}</div>
          {plan?.expiresAt && (isPro || plan?.isExpired) && (
            <div className="text-xs text-muted-foreground mt-0.5">{isPro ? "Expires" : "Expired"} {formatDate(String(plan.expiresAt).slice(0, 10))}</div>
          )}
        </div>
      </div>
      <Button variant="outline" onClick={() => navigate("/plan")}>
        Manage Plan <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}