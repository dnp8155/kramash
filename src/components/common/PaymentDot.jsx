import { cn } from "@/lib/utils";

// Payment status dot — reflects paid vs agreed amount.
// RED    = Full payment pending (nothing or zero paid)
// ORANGE = Partial payment (some paid, less than agreed)
// GREEN  = Fully paid (exactly agreed)
// BLUE   = Overpaid (paid more than agreed, e.g. agreed 5000, paid 6000)
//
// Returns { color, label, className } for a given paid/agreed pair.
export function paymentDotInfo(paid = 0, agreed = 0) {
  const p = Number(paid) || 0;
  const a = Number(agreed) || 0;
  if (a <= 0) {
    // No agreed amount — if anything was paid, it's an overpay (blue); else nothing due.
    return p > 0
      ? { color: "blue", label: "Overpaid", className: "bg-[#3b82f6]" }
      : { color: "neutral", label: "No amount due", className: "bg-muted-foreground/30" };
  }
  if (p <= 0) return { color: "red", label: "Full payment pending", className: "bg-[#ef4444]" };
  if (p < a) return { color: "orange", label: "Partial payment", className: "bg-[#f59e0b]" };
  if (p === a) return { color: "green", label: "Fully paid", className: "bg-[#10b981]" };
  return { color: "blue", label: "Overpaid", className: "bg-[#3b82f6]" };
}

// Renders a single payment dot with an optional tooltip title.
export default function PaymentDot({ paid = 0, agreed = 0, size = "sm", className }) {
  const info = paymentDotInfo(paid, agreed);
  const sizeClass = size === "lg" ? "w-3 h-3" : "w-2 h-2";
  return (
    <span
      title={info.label}
      className={cn("inline-block rounded-full shrink-0", sizeClass, info.className, className)}
    />
  );
}