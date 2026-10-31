// Launch / festival offer shown on the landing page's pricing section.
//
// IMPORTANT — display only. The price a customer actually pays is the one in the plans table (plan_pricings,
// edited in Admin → Plans & Pricing); the payment function reads it from the database on the server. This file only
// controls what the landing page SHOWS. During the offer the table holds the offer prices; when it ends, put the
// regular prices in the table and set `enabled` to false (it also switches itself off after `endsOn`).
//
// listPrices: the regular price per billing cycle, shown struck through next to the offer price. Only fill these in
// with prices you will really charge after the offer — leave a cycle out to show no "was" price for it.
// Hand-picked early users get 1 month of Pro free (assigned by an admin: Assign Pro → "Launch offer"). Shown in admin
// as "X of N used". Keep in sync with LAUNCH_FREE_MONTH_CAP in supabase/functions/assignProSubscription/index.ts,
// which is what actually enforces the limit.
export const LAUNCH_FREE_MONTH_CAP = 80;
// Set to false to hide the "free first month" note on the landing page pricing (e.g. once the spots are gone).
export const SHOW_FREE_MONTH_NOTE = true;
export const FREE_MONTH_SHORT = "1 month of Pro free for selected early users · limited spots";

export const LAUNCH_OFFER = {
  enabled: true,
  endsOn: "2026-11-25", // last day of the offer (inclusive): the day after Dev Diwali (24 Nov 2026)

  // Regular prices (what you charge after the offer). Offer prices are set in Admin → Plans & Pricing:
  // 249 / 1,199 / 2,199.
  listPrices: {
    MONTHLY: 299,
    SIX_MONTHS: 1599,
    ANNUAL: 2999,
  },
  // The sale prices shown in the FAQ text (the real charge always comes from the plans table).
  offerPrices: {
    MONTHLY: 249,
    SIX_MONTHS: 1199,
    ANNUAL: 2199,
  },
  // Payments are one-time Razorpay orders (no auto-renewal), so the offer applies to purchases made while it runs.
  priceLockNote: "Offer prices apply to every purchase made before the offer ends.",

  themes: {
    diwali: {
      blessing: "॥ श्री गणेशाय नमः ॥  ·  शुभ दीपावली",
      title: "Diwali Launch Offer",
      subtitle: "Light up your business this Diwali — launch prices for our first customers, available only during the festival.",
      ribbon: "Diwali Special Offer",
      // Optional illustration (e.g. "/festive/ganesh.png" placed in /public).
      image: "",
    },
  },
};

// Whole days left including today, or 0 when the offer is over.
export function launchOfferDaysLeft(now = new Date()) {
  const end = new Date(`${LAUNCH_OFFER.endsOn}T23:59:59`);
  const ms = end.getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
}

// The "1 month of Pro free" note: shown only while the offer itself runs (and SHOW_FREE_MONTH_NOTE is on), so
// every place that mentions it goes back to normal on its own after `endsOn`.
export function isFreeMonthNoteVisible(now = new Date()) {
  return SHOW_FREE_MONTH_NOTE && !!getActiveLaunchOffer(now);
}

export function getActiveLaunchOffer(now = new Date()) {
  if (!LAUNCH_OFFER.enabled) return null;
  const daysLeft = launchOfferDaysLeft(now);
  if (daysLeft <= 0) return null;
  const theme = "diwali";
  return { ...LAUNCH_OFFER, daysLeft, theme, copy: LAUNCH_OFFER.themes[theme] };
}
