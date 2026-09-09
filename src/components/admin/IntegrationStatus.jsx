import { useEffect, useState } from "react";
import { Phone, CreditCard, Check, X, Loader2 } from "lucide-react";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import { base44 } from "@/api/base44Client";

// Shows real configuration status of third-party integrations.
// Never exposes secret values — only configured/not-configured status.
export default function IntegrationStatus() {
  const [otpStatus, setOtpStatus] = useState(null); // null = loading, true/false
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [otpRes, payRes] = await Promise.all([
          base44.functions.invoke("phoneOtp", { action: "check" }).catch(() => null),
          base44.functions.invoke("processPayment", { action: "check" }).catch(() => null),
        ]);
        setOtpStatus(otpRes?.configured ?? false);
        setPaymentStatus(payRes?.configured ?? false);
      } catch {
        setOtpStatus(false);
        setPaymentStatus(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statuses = [
    {
      label: "Phone OTP Provider",
      icon: Phone,
      configured: otpStatus,
      description: "Twilio Verify for SMS OTP",
    },
    {
      label: "Payment Gateway",
      icon: CreditCard,
      configured: paymentStatus,
      description: "Stripe for subscription checkout",
    },
    {
      label: "Google Auth",
      icon: Check,
      configured: true,
      description: "Built-in OAuth (always available)",
    },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Integration Status</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking integrations…
          </div>
        ) : (
          statuses.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
                {s.configured ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <X className="h-3.5 w-3.5" /> Not Configured
                  </span>
                )}
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}