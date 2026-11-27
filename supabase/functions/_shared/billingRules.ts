// Billing rules kept free of any database or Deno code so they can be tested (tests/billingRules.test.js).

// When a paid period starts: paying while Pro is still active adds the new period after the current end date
// (20 days left + 1 year = 1 year and 20 days), so a renewal never loses days. Otherwise it starts today.
export function renewalBaseDate(today: string, activeSubs: any[]): string {
  const ends = (activeSubs || []).map((s) => String(s?.expires_at || "").slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today).sort();
  return ends.length ? ends[ends.length - 1] : today;
}

// Renewal window: a workspace on PAID Pro can renew only in the last 30 days before it ends (prices may change, so
// nobody locks in today's price months ahead). Pro given by an admin or the free launch month is never held back.
// One extra day of slack: "today" here is the UTC date, a few hours behind India just after midnight.
export const RENEW_WINDOW_DAYS = 30;
const addDaysIso = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export function paidProEnd(activeSubs: any[]): string | null {
  const ends = (activeSubs || []).filter((s) => s?.source === "PAYMENT_GATEWAY")
    .map((s) => String(s?.expires_at || "").slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return ends.length ? ends[ends.length - 1] : null;
}
export function renewalTooEarly(today: string, activeSubs: any[]): { end: string; opensOn: string } | null {
  const end = paidProEnd(activeSubs);
  if (!end) return null;
  if (end <= addDaysIso(today, RENEW_WINDOW_DAYS + 1)) return null;
  return { end, opensOn: addDaysIso(end, -RENEW_WINDOW_DAYS) };
}
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

// Razorpay TEST keys start with rzp_test_. With them on the live project, only listed workspaces may pay.
export function isTestKey(keyId: string | null | undefined): boolean {
  return String(keyId || "").startsWith("rzp_test_");
}

export function workspaceInTestList(workspaceId: string, list: string | null | undefined): boolean {
  return !!workspaceId && String(list || "").split(",").map((s) => s.trim()).filter(Boolean).includes(workspaceId);
}

// Pro expiry reminders (generateNotifications): one each at 10, 7, 3 and 1 day left and on the last day.
// daysLeft = expiry day minus today (0 = Pro's last day, it is valid until the end of it). null when no reminder is due.
export const EXPIRY_REMINDER_DAYS = 10;
export function expiryReminderStage(daysLeft: number): string | null {
  if (!(daysLeft >= 0) || daysLeft > EXPIRY_REMINDER_DAYS) return null;
  if (daysLeft === 0) return "today";
  if (daysLeft === 1) return "1d";
  if (daysLeft <= 3) return "3d";
  if (daysLeft <= 7) return "7d";
  return "10d";
}

export function expiryReminderText(daysLeft: number, dateText: string, isLaunch: boolean) {
  const when = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  if (isLaunch) {
    return {
      title: daysLeft === 0 ? "Your free launch month ends today" : "Your free launch month is ending soon",
      message: `Your free launch month ends ${when} (${dateText}). Request renewal in Your Plan to keep Pro, and we'd love your feedback or a review.`,
    };
  }
  return {
    title: daysLeft === 0 ? "Pro ends today" : daysLeft <= 3 ? `Pro ends ${when}` : "Pro plan expiring soon",
    message: `Your Kramasha Pro plan ends ${when} (${dateText}). Renew in Your Plan to keep Pro. Renewing early adds the new period after this date, so you lose no days.`,
  };
}

// Does what Razorpay captured match what this payment row is for? Amount in paise, currency, and order id.
// expectedAmount is in rupees (the row's amount, set by the server when the order was made).
export function capturedMatches(rzp: any, expected: { orderId: string; amount: number; currency?: string | null }): string {
  if (!rzp) return "Payment details missing";
  if (expected.orderId && rzp.order_id && rzp.order_id !== expected.orderId) return "Payment belongs to a different order";
  const paise = Math.round(Number(expected.amount) * 100);
  if (!(Number(rzp.amount) === paise)) return `Amount mismatch (paid ${rzp.amount}, expected ${paise})`;
  const cur = String(expected.currency || "INR").toUpperCase();
  if (rzp.currency && String(rzp.currency).toUpperCase() !== cur) return `Currency mismatch (${rzp.currency})`;
  return "";
}
