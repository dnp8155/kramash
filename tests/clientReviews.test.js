import { describe, it, expect } from "vitest";
import { reviewNotifyChannels, buildReviewState, eventIsOver, lastDay } from "../supabase/functions/_shared/reviewRules.ts";

const TZ = "Asia/Kolkata";
const NOW = new Date("2026-11-19T06:30:00Z"); // 19 Nov 2026, 12:00 IST

describe("review notifications follow Preferences → Notifications", () => {
  it("everything on (or never set): bell, and push on Pro", () => {
    expect(reviewNotifyChannels({}, true)).toEqual({ bell: true, push: true });
    expect(reviewNotifyChannels(null, true)).toEqual({ bell: true, push: true });
    expect(reviewNotifyChannels({ reviews: true, in_app: true, push: true }, true)).toEqual({ bell: true, push: true });
  });
  it("Client reviews switched off: nothing at all", () => {
    expect(reviewNotifyChannels({ reviews: false }, true)).toEqual({ bell: false, push: false });
    expect(reviewNotifyChannels({ reviews: false, in_app: true, push: true }, true)).toEqual({ bell: false, push: false });
  });
  it("In-app off: push only; Push off: bell only", () => {
    expect(reviewNotifyChannels({ in_app: false }, true)).toEqual({ bell: false, push: true });
    expect(reviewNotifyChannels({ push: false }, true)).toEqual({ bell: true, push: false });
    expect(reviewNotifyChannels({ in_app: false, push: false }, true)).toEqual({ bell: false, push: false });
  });
  it("push is Pro only; the bell works on every plan", () => {
    expect(reviewNotifyChannels({}, false)).toEqual({ bell: true, push: false });
  });
  it("saving without changing anything sends nothing", () => {
    expect(reviewNotifyChannels({}, true, false)).toEqual({ bell: false, push: false });
  });
});

describe("when a booking counts as over", () => {
  it("last date passed, Completed, cancelled / postponed", () => {
    expect(lastDay({ event_dates: ["2026-11-13", "2026-11-12"] })).toBe("2026-11-13");
    expect(eventIsOver({ status: "upcoming", event_dates: ["2026-11-18"] }, TZ, NOW)).toBe(true);
    expect(eventIsOver({ status: "in-progress", event_dates: ["2026-11-19"] }, TZ, NOW)).toBe(false); // today is not over yet
    expect(eventIsOver({ status: "completed", event_dates: ["2026-12-20"] }, TZ, NOW)).toBe(true);
    expect(eventIsOver({ status: "cancelled", event_dates: ["2026-11-01"] }, TZ, NOW)).toBe(false);
    expect(eventIsOver({ status: "postponed", start_date: "2026-11-01" }, TZ, NOW)).toBe(false);
    expect(eventIsOver({ status: "upcoming" }, TZ, NOW)).toBe(false);
  });
});

describe("the client's one review", () => {
  const wedding = { title: "Wedding", status: "upcoming", event_dates: ["2026-11-12", "2026-11-13"] };
  const shower = { title: "Baby Shower", status: "upcoming", event_dates: ["2026-11-18"] };
  const future = { title: "Anniversary", status: "upcoming", event_dates: ["2026-12-20"] };

  it("is not asked for until a booking is over, except on the review link", () => {
    expect(buildReviewState({}, [future], TZ, false, NOW).open).toBe(false);
    expect(buildReviewState({}, [], TZ, false, NOW).open).toBe(false);
    expect(buildReviewState({}, [future], TZ, true, NOW).open).toBe(true);
    expect(buildReviewState({}, [wedding, future], TZ, false, NOW).open).toBe(true);
  });

  it("shows the saved review, marked Edited after a change", () => {
    const first = { review_rating: 5, review_text: "Lovely", review_created_at: "2026-11-14T10:00:00Z", review_updated_at: "2026-11-14T10:00:00Z" };
    const s1 = buildReviewState(first, [wedding], TZ, false, NOW);
    expect(s1).toMatchObject({ open: true, rating: 5, review: "Lovely", edited: false, nudge: "" });
    const s2 = buildReviewState({ ...first, review_rating: 4, review_updated_at: "2026-11-15T10:00:00Z" }, [wedding], TZ, false, NOW);
    expect(s2).toMatchObject({ rating: 4, edited: true, reviewed_at: "2026-11-15T10:00:00Z" });
  });

  it("asks for an update when another booking finished after the last edit, and stops once updated", () => {
    const written14 = { review_rating: 5, review_text: "", review_created_at: "2026-11-14T10:00:00Z", review_updated_at: "2026-11-14T10:00:00Z" };
    expect(buildReviewState(written14, [wedding, shower], TZ, false, NOW).nudge).toBe("Baby Shower");
    const written19 = { ...written14, review_updated_at: "2026-11-19T05:00:00Z" };
    expect(buildReviewState(written19, [wedding, shower], TZ, false, NOW).nudge).toBe("");
    expect(buildReviewState(written14, [wedding], TZ, false, NOW).nudge).toBe(""); // nothing new since
  });

  it("an event marked Completed before its dates opens the review but never nudges (later saves must not re-ask)", () => {
    const early = { title: "Shoot", status: "completed", event_dates: ["2026-12-20"], updated_at: "2026-11-18T09:00:00Z" };
    const noDates = { title: "Consult", status: "completed", updated_at: "2026-11-18T09:00:00Z" };
    const before = { review_rating: 5, review_created_at: "2026-11-14T10:00:00Z", review_updated_at: "2026-11-14T10:00:00Z" };
    expect(buildReviewState({}, [early], TZ, false, NOW).open).toBe(true);
    expect(buildReviewState(before, [early], TZ, false, NOW).nudge).toBe("");
    expect(buildReviewState(before, [noDates], TZ, false, NOW).nudge).toBe("");
  });

  it("a review that exists can always be edited, even with nothing over (it came from the review link)", () => {
    const fromLink = { review_rating: 5, review_text: "", review_created_at: "2026-11-10T10:00:00Z", review_updated_at: "2026-11-10T10:00:00Z" };
    expect(buildReviewState(fromLink, [future], TZ, false, NOW).open).toBe(true);
    expect(buildReviewState(fromLink, [{ ...wedding, status: "postponed" }], TZ, false, NOW).open).toBe(true);
  });

  it("no rating means nothing to show yet", () => {
    expect(buildReviewState({ review_rating: null, review_text: "x" }, [wedding], TZ, false, NOW)).toMatchObject({ rating: null, review: "", reviewed_at: "", nudge: "" });
  });
});
