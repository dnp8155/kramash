import { Check, Sparkles } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    current: true,
    features: ["Up to 5 events", "1 workspace", "Basic rate estimator", "Community support"],
    cta: "Current Plan",
  },
  {
    name: "Pro",
    price: "₹1,499",
    period: "per month",
    highlighted: true,
    features: ["Unlimited events", "Multiple workspaces", "GST-enabled quotations", "Team invitations", "Priority support", "Payment tracking"],
    cta: "Upgrade to Pro",
  },
  {
    name: "Studio",
    price: "₹3,999",
    period: "per month",
    features: ["Everything in Pro", "Unlimited team members", "Custom branding", "API access", "Dedicated manager"],
    cta: "Contact Sales",
  },
];

export default function Plan() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Your Plan" description="Manage your subscription and billing." />

      <Card className="border-primary/30 bg-accent/40">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">You're on the Free plan</p>
              <p className="text-xs text-muted-foreground">3 of 5 events used this cycle</p>
            </div>
          </div>
          <Button>Upgrade Plan</Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "relative flex flex-col transition-shadow hover:shadow-md",
              plan.highlighted && "border-primary ring-1 ring-primary"
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most Popular
              </span>
            )}
            <CardBody className="flex flex-1 flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{plan.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/ {plan.period}</span>
                </div>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "primary" : plan.current ? "outline" : "secondary"}
                disabled={plan.current}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}