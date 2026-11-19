// What the Your Plan page says about how long Pro lasts. Pro is valid through the END of its expiry day
// (same rule as planService.resolveWorkspacePlan). Pure, so it can be tested (tests/planValidity.test.js).

const DAY = 86400000;
const dayNum = (ymd) => {
  const [y, m, d] = String(ymd || "").slice(0, 10).split("-").map(Number);
  return y && m && d ? Date.UTC(y, m - 1, d) / DAY : null;
};
const localToday = (now) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const SOURCE_LABELS = {
  PAYMENT_GATEWAY: "Paid online (Razorpay)",
  PROMOTIONAL: "Free launch month",
  ADMIN: "Activated by Kramasha",
};

// subscription: the workspace's current subscription row (started_at, expires_at, source, billing_cycle_snapshot).
export function planValidity(subscription, now = new Date()) {
  if (!subscription?.expires_at) return null;
  const end = dayNum(subscription.expires_at);
  const start = dayNum(subscription.started_at) ?? end;
  const today = dayNum(localToday(now));
  if (end === null || today === null) return null;

  const daysLeft = end - today; // 0 = last day is today
  const total = Math.max(1, end - start + 1);
  const used = Math.min(total, Math.max(0, today - start + 1));
  // A subscription that was cancelled or marked expired has ended, whatever its end date says.
  const status = String(subscription.status || "ACTIVE").toUpperCase();
  const expired = daysLeft < 0 || status === "CANCELLED" || status === "EXPIRED";
  const tone = expired ? "expired" : daysLeft <= 2 ? "urgent" : daysLeft <= 7 ? "soon" : "ok";
  const headline = expired
    ? "Pro has ended"
    : daysLeft === 0 ? "Last day of Pro today"
    : daysLeft === 1 ? "1 day left"
    : `${daysLeft} days left`;

  return {
    startedAt: String(subscription.started_at || subscription.expires_at).slice(0, 10),
    expiresAt: String(subscription.expires_at).slice(0, 10),
    daysLeft,
    totalDays: total,
    // How much of the period has gone by (0–100), for the bar.
    usedPercent: expired ? 100 : Math.round((used / total) * 100),
    expired,
    tone,
    headline,
    source: SOURCE_LABELS[subscription.source] || "Pro",
    cycle: subscription.billing_cycle_snapshot || "",
  };
}
