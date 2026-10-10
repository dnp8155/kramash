// Launch / festival offer shown on the landing page's pricing section.
//
// IMPORTANT — display only. The price a customer actually pays is the one in the plans table (plan_pricings,
// edited in Admin → Plans & Pricing); the payment function reads it from the database on the server. This file only
// controls what the landing page SHOWS. During the offer the table holds the offer prices; when it ends, put the
// regular prices in the table and set `enabled` to false (it also switches itself off after `endsOn`).
//
// listPrices: the regular price per billing cycle, shown struck through next to the offer price. Only fill these in
// with prices you will really charge after the offer — leave a cycle out to show no "was" price for it.
export const LAUNCH_OFFER = {
  enabled: true,
  endsOn: "2026-12-10", // last day of the offer (inclusive)

  // "auto": Navratri look until `navratriEndsOn`, then the Diwali look. Or force "navratri" / "diwali".
  theme: "auto",
  navratriEndsOn: "2026-10-20", // Dussehra

  // Regular prices (what you charge after the offer). Offer prices are set in Admin → Plans & Pricing:
  // 249 / 1,199 / 2,199.
  listPrices: {
    MONTHLY: 299,
    SIX_MONTHS: 1599,
    ANNUAL: 2999,
  },
  // Payments are one-time Razorpay orders (no auto-renewal), so the offer applies to purchases made while it runs.
  priceLockNote: "Offer prices apply to every purchase made before the offer ends.",

  themes: {
    navratri: {
      blessing: "॥ जय माता दी ॥",
      title: "Navratri Special Launch Offer",
      subtitle: "Begin something new this Navratri — launch prices for our first customers, available only during the festival.",
      ribbon: "Navratri Special Offer",
      // Optional illustration (e.g. "/festive/mataji.png" placed in /public). Shown beside the banner text when set.
      image: "",
    },
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

export function getActiveLaunchOffer(now = new Date()) {
  if (!LAUNCH_OFFER.enabled) return null;
  const daysLeft = launchOfferDaysLeft(now);
  if (daysLeft <= 0) return null;
  let theme = LAUNCH_OFFER.theme;
  if (theme !== "navratri" && theme !== "diwali") {
    const navEnd = new Date(`${LAUNCH_OFFER.navratriEndsOn}T23:59:59`);
    theme = now <= navEnd ? "navratri" : "diwali";
  }
  return { ...LAUNCH_OFFER, daysLeft, theme, copy: LAUNCH_OFFER.themes[theme] };
}
