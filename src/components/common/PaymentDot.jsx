import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

export function paymentDotInfo(paid = 0, agreed = 0) {
  const p = Number(paid) || 0;
  const a = Number(agreed) || 0;
  if (a <= 0) {
    return p > 0
      ? { color: "blue", label: "Overpaid", className: "bg-[#2563eb]" }
      : { color: "neutral", label: "No amount due", className: "bg-muted-foreground/30" };
  }
  if (p <= 0) return { color: "red", label: "Pending", className: "bg-[#D32F2F]" };
  if (p < a) return { color: "orange", label: "Partial", className: "bg-[#f97316]" };
  if (p === a) return { color: "green", label: "Paid", className: "bg-[#22c55e]" };
  return { color: "blue", label: "Overpaid", className: "bg-[#2563eb]" };
}

// done      — nothing to pay (e.g. workspace owner share): always green.
// blocked   — otherwise-green dot held back as partial because something else is still unpaid.
export default function PaymentDot({ paid = 0, agreed = 0, size = "sm", className, done = false, blocked = false }) {
  const t = useT();
  let info = paymentDotInfo(paid, agreed);
  if (done) info = { color: "green", label: "Owner share", className: "bg-[#22c55e]" };
  else if (blocked && info.color === "green") info = { color: "orange", label: "Team / services pending", className: "bg-[#f97316]" };
  const sizeClass = size === "lg" ? "w-3 h-3" : "w-2 h-2";
  return (
    <span
      title={t(info.label)}
      className={cn("status-dot inline-block rounded-full shrink-0", sizeClass, info.className, className)}
    />
  );
}