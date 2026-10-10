import AnimatedNumber from "@/components/common/AnimatedNumber";
import { formatMoney } from "@/utils/format";

// A currency amount that counts up on first render and tweens when it changes.
// Whole-number amounts don't flash decimals mid-count.
export default function AnimatedMoney({ value, currency = "INR" }) {
  const target = Number(value) || 0;
  return (
    <AnimatedNumber
      value={target}
      from={0}
      format={(v) => formatMoney(Number.isInteger(target) ? Math.round(v) : v, currency)}
    />
  );
}
