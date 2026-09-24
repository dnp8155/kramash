import { cn } from "@/lib/utils";

export function paymentDotInfo(paid = 0, agreed = 0) {
  const p = Number(paid) || 0;
  const a = Number(agreed) || 0;
  if (a <= 0) {
    return p > 0
      ? { color: "red", label: "Overpaid", className: "bg-[#D32F2F]" }
      : { color: "neutral", label: "No amount due", className: "bg-muted-foreground/30" };
  }
  if (p <= 0) return { color: "red", label: "Pending", className: "bg-[#D32F2F]" };
  if (p < a) return { color: "orange", label: "Partial", className: "bg-[#f97316]" };
  if (p === a) return { color: "green", label: "Paid", className: "bg-[#22c55e]" };
  return { color: "red", label: "Overpaid", className: "bg-[#D32F2F]" };
}

export default function PaymentDot({ paid = 0, agreed = 0, size = "sm", className }) {
  const info = paymentDotInfo(paid, agreed);
  const sizeClass = size === "lg" ? "w-3 h-3" : "w-2 h-2";
  return (
    <span
      title={info.label}
      className={cn("status-dot inline-block rounded-full shrink-0", sizeClass, info.className, className)}
    />
  );
}