// Rules for client reviews (one per client, like a Google review). Kept free of any database or Deno code so the
// rules can be tested (tests/clientReviews.test.js). The database reads are in clientReview.ts.
import { todayInTz } from "./helpers.ts";

export const REVIEW_MAX_LENGTH = 1000;

// The event's last date (YYYY-MM-DD), or "".
export function lastDay(event: any): string {
  const dates = (Array.isArray(event?.event_dates) && event.event_dates.length > 0 ? event.event_dates : [event?.start_date, event?.end_date])
    .filter(Boolean).map((d: string) => String(d).slice(0, 10)).sort();
  return dates[dates.length - 1] || "";
}

// Over = marked Completed, or its last date has passed (in the business's time zone). Cancelled / postponed never count.
export function eventIsOver(event: any, timezone?: string | null, now: Date = new Date()): boolean {
  const status = event?.status || "upcoming";
  if (status === "cancelled" || status === "postponed") return false;
  if (status === "completed") return true;
  const last = lastDay(event);
  return !!last && todayInTz(timezone, now) > last;
}

// What a client page shows, from the client's review columns and their events.
// `rating: null` + `open: true` = ask for a review. `nudge` = the title of an event that finished after the review
// was last written (the card asks them to update it). `anytime`: the client's own review link (/review/…), which the
// owner sent on purpose, is open even before a booking is over.
export function buildReviewState(client: any, events: any[], timezone?: string | null, anytime = false, now: Date = new Date()) {
  const today = todayInTz(timezone, now);
  const over = (events || []).filter((e) => eventIsOver(e, timezone, now));
  // The nudge only counts bookings whose dates have passed. One marked Completed before its dates (or with none) still
  // opens the review, but has no reliable "finished on" day (any later save changes updated_at), so it never nudges.
  const finished = over.map((e) => ({ title: e.title || "", day: lastDay(e) }))
    .filter((x) => x.day && x.day < today)
    .sort((a, b) => (a.day < b.day ? 1 : -1));
  const rating = Number(client?.review_rating) || null;
  const writtenAt = rating ? (client.review_updated_at || client.review_created_at || "") : "";
  const writtenDay = writtenAt ? todayInTz(timezone, new Date(writtenAt)) : "";
  const latest = finished[0];
  return {
    // A review that exists can always be edited (it may have come from the review link before anything was over,
    // or a booking may have moved back to postponed since).
    open: anytime || over.length > 0 || !!rating,
    rating,
    review: rating ? (client.review_text || "") : "",
    reviewed_at: writtenAt,
    edited: !!rating && !!client.review_created_at && !!client.review_updated_at && client.review_updated_at > client.review_created_at,
    nudge: rating && latest && writtenDay && latest.day > writtenDay ? latest.title : "",
  };
}

// Where the owner hears about a new / edited review, from Preferences → Notifications.
// "Client reviews" off = nowhere. In-app and Push are separate channels (as for every other category); push also needs
// the Pro plan. A missing key counts as on. Nothing is sent when the client saved without changing anything.
export function reviewNotifyChannels(prefs: any, isPro: boolean, changed = true) {
  const p = prefs || {};
  const on = changed && p.reviews !== false;
  return { bell: on && p.in_app !== false, push: on && isPro && p.push !== false };
}
