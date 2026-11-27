import { Link } from "react-router-dom";
import { XCircle, Undo2, Clock } from "lucide-react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";

// What the person sees when a payment did not end in Pro. A success is celebrated by ProWelcomeDialog once the plan
// reloads; these three stay on screen until closed, because a toast is easy to miss when money may have moved.
const KINDS = {
  cancelled: {
    icon: Undo2,
    tone: "bg-muted text-muted-foreground ring-muted/50",
    title: "Payment cancelled",
    sub: "You closed the payment window, so nothing was charged and your plan has not changed.",
    note: null,
  },
  failed: {
    icon: XCircle,
    tone: "bg-destructive/10 text-destructive ring-destructive/5",
    title: "Payment failed",
    sub: "The payment did not go through, so Pro has not been added.",
    note: "If money was deducted from your account, your bank returns it automatically, usually within 5–7 business days.",
  },
  unconfirmed: {
    icon: Clock,
    tone: "bg-warning/10 text-warning ring-warning/5",
    title: "We could not confirm your payment yet",
    sub: "Your payment may have gone through, but we have not been able to confirm it on our side.",
    note: "If you were charged, Pro switches on automatically within a few minutes, so please do not pay again. If it has not appeared within 30 minutes, write to us with the payment ID below.",
  },
};

export default function PaymentResultDialog({ open, onOpenChange, kind = "failed", detail, paymentId, onRetry }) {
  const k = KINDS[kind] || KINDS.failed;
  const Icon = k.icon;
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader className="items-center text-center border-b-0 pb-0">
          <div className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full ring-8 ${k.tone}`}>
            <Icon className="h-8 w-8" />
          </div>
          <AppDialogTitle className="pr-0 text-xl">{k.title}</AppDialogTitle>
          <AppDialogDescription className="pr-0">{k.sub}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-3">
          {detail && <p className="text-sm text-foreground text-center">{detail}</p>}
          {k.note && <p className="text-sm text-muted-foreground text-center">{k.note}</p>}
          {paymentId && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Payment ID</span>
              <span className="text-xs font-medium text-foreground break-all text-right select-all">{paymentId}</span>
            </div>
          )}
          {kind !== "cancelled" && (
            <p className="text-xs text-muted-foreground text-center">
              Need help? Email <a href="mailto:kramashaofficial@gmail.com" className="font-medium text-foreground underline underline-offset-2">kramashaofficial@gmail.com</a>
              {" "}from your sign-in address, or read the <Link to="/refund-policy" className="font-medium text-foreground underline underline-offset-2">Refund &amp; Cancellation Policy</Link>.
            </p>
          )}
        </AppDialogBody>
        <AppDialogFooter>
          {kind !== "unconfirmed" && onRetry && <Button onClick={onRetry}>Try again</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
