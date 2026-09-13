import { cn } from "@/lib/utils";

// Payment status dot — reflects paid vs agreed amount.
// Status is CALCULATED from payment info, then mapped to a color:
//   Due      → red    (paidAmount = 0)
//   Partial  → amber  (0 < paidAmount < rate)
//   Paid     → green  (paidAmount = rate)
//   Overpaid → blue   (paidAmount > rate)
//
// Returns { color, label, className } for a given paid/agreed pair.
export function paymentDotInfo(paid = 0, agreed = 0) {
  const p = Number(paid) || 0;
  const a = Number(agreed) || 0;
  if (a <= 0) {
    return p > 0
      ? { color: "blue", label: "Overpaid", className: "bg-[#3b82f6]" }
      : { color: "neutral", label: "No amount due", className: "bg-muted-foreground/30" };
  }
  if (p <= 0) return { color: "red", label: "Due", className: "bg-[#ef4444]" };
  if (p < a) return { color: "amber", label: "Partial", className: "bg-[#f59e0b]" };
  if (p === a) return { color: "green", label: "Paid", className: "bg-[#10b981]" };
  return { color: "blue", label: "Overpaid", className: "bg-[#3b82f6]" };
}

// Renders a single payment dot with an optional tooltip title.
// Uses .status-dot class so the global "Show status dots" preference can hide it via CSS.
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