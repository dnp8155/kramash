// Your Plan → renewing Pro. A workspace on PAID Pro can renew only in the last 30 days before it ends: prices may
// change, so nobody locks in today's price months ahead. Pro given by an admin or the free launch month is never held
// back. The server checks the same rule before a payment can start (createPaymentOrder, billingRules.renewalTooEarly).
export const RENEW_WINDOW_DAYS = 30;

const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const toIso = (d) => d.toISOString().slice(0, 10);

export function addDaysIso(iso, n) {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function daysBetween(fromIso, toIsoDate) {
  return Math.round((utc(toIsoDate) - utc(fromIso)) / 86400000);
}

// Same month arithmetic as the server (planEngine.computeExpiry): 31 Jan + 1 month → 28/29 Feb.
export function addMonthsIso(iso, months) {
  const d = utc(iso);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return toIso(d);
}

// { end, daysLeft, opensOn, tooEarly } for an active Pro, else null. tooEarly only for paid Pro (PAYMENT_GATEWAY).
export function renewalWindow({ isPro, expiresAt, source, today }) {
  const end = String(expiresAt || "").slice(0, 10);
  if (!isPro || !isIso(end) || !isIso(today)) return null;
  const daysLeft = daysBetween(today, end);
  // Already past (e.g. an exempt admin account still showing an old end date): no window, the page behaves as before.
  if (daysLeft < 0) return null;
  return {
    end,
    daysLeft,
    opensOn: addDaysIso(end, -RENEW_WINDOW_DAYS),
    tooEarly: source === "PAYMENT_GATEWAY" && daysLeft > RENEW_WINDOW_DAYS,
  };
}
