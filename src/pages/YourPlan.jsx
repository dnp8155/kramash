import { Crown, Check } from "lucide-react";
import Button from "@/components/common/Button";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "free",
    title: "Free",
    price: "₹0",
    period: "/month",
    features: ["Up to 5 events", "Up to 3 team members", "Basic quotation", "Payment tracking"],
    cta: "Current Plan"
  },
  {
    name: "pro",
    title: "Pro",
    price: "₹999",
    period: "/month",
    features: ["Unlimited events", "Up to 50 team members", "GST invoices", "Reminders & notifications", "Export to Excel", "Sign a PDF"],
    cta: "Upgrade to Pro",
    highlight: true
  }
];

export default function YourPlan() {
  const { workspace } = useWorkspace();
  const currentPlan = workspace?.plan_type || "free";

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your Plan</h2>
          <p className="text-sm text-muted-foreground">
            You're currently on the {currentPlan === "pro" ? "Pro" : "Free"} plan.
            {workspace?.plan_status && ` · ${workspace.plan_status}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((p) => {
          const current = currentPlan === p.name;
          return (
            <div
              key={p.name}
              className={cn(
                "bg-card border rounded-lg p-5 flex flex-col",
                p.highlight ? "border-primary shadow-sm" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{p.title}</h3>
                {current && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Current</span>}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-4 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={p.highlight ? "primary" : "outline"} className="mt-5" disabled={current}>
                {current ? "Current Plan" : p.cta}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Billing and payment gateway integration will be available in a future phase.{" "}
        <Link to="/app-updates" className="text-primary underline">Learn more</Link>.
      </p>
    </div>
  );
}