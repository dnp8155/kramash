import { describe, it, expect } from "vitest";
import { planPushChanges, shouldAskForPush } from "../src/lib/pushPlanSync.js";

describe("push follows the plan", () => {
  it("Pro → Free switches Push off, remembers the plan did it, and unsubscribes this device", () => {
    expect(planPushChanges({ plan_seen: "PRO", push: true }, false))
      .toEqual({ changes: { plan_seen: "FREE", push: false, push_off_by_plan: true }, unsubscribeDevice: true, wentFree: true });
    // Push never set counts as on.
    expect(planPushChanges({ plan_seen: "PRO" }, false).changes.push_off_by_plan).toBe(true);
  });

  it("Push the owner had already switched off is not marked as switched off by the plan", () => {
    expect(planPushChanges({ plan_seen: "PRO", push: false }, false).changes)
      .toEqual({ plan_seen: "FREE", push: false, push_off_by_plan: false });
  });

  it("Free → Pro switches Push back on only if the plan had switched it off", () => {
    expect(planPushChanges({ plan_seen: "FREE", push: false, push_off_by_plan: true }, true).changes)
      .toEqual({ plan_seen: "PRO", push: true, push_off_by_plan: false });
    expect(planPushChanges({ plan_seen: "FREE", push: false, push_off_by_plan: false }, true).changes)
      .toEqual({ plan_seen: "PRO" });
  });

  it("no change while the plan stays the same", () => {
    expect(planPushChanges({ plan_seen: "PRO", push: true }, true)).toBeNull();
    expect(planPushChanges({ plan_seen: "FREE", push: false }, false)).toBeNull();
  });

  it("first visit after this ships: only notes the plan, never touches Push on Free", () => {
    expect(planPushChanges({ push: true }, false)).toEqual({ changes: { plan_seen: "FREE" }, unsubscribeDevice: false, wentFree: false });
    expect(planPushChanges({}, true)).toEqual({ changes: { plan_seen: "PRO" }, unsubscribeDevice: false, wentFree: false });
  });

  it("a full round trip Pro → Free → Pro ends with Push on again", () => {
    let prefs = { plan_seen: "PRO", push: true };
    prefs = { ...prefs, ...planPushChanges(prefs, false).changes };
    expect(prefs.push).toBe(false);
    prefs = { ...prefs, ...planPushChanges(prefs, true).changes };
    expect(prefs).toMatchObject({ plan_seen: "PRO", push: true, push_off_by_plan: false });
  });
});

describe("asking a device to turn push on", () => {
  const base = { pushAllowed: true, supported: true, permission: "default", subscribed: false, prefs: {}, askedBefore: false };
  it("asks a Pro device that isn't subscribed yet", () => {
    expect(shouldAskForPush(base)).toBe(true);
    expect(shouldAskForPush({ ...base, permission: "granted" })).toBe(true);
  });
  it("never asks on Free, when blocked, unsupported, already on, switched off by the owner, or already asked", () => {
    expect(shouldAskForPush({ ...base, pushAllowed: false })).toBe(false);
    expect(shouldAskForPush({ ...base, permission: "denied" })).toBe(false);
    expect(shouldAskForPush({ ...base, supported: false })).toBe(false);
    expect(shouldAskForPush({ ...base, subscribed: true })).toBe(false);
    expect(shouldAskForPush({ ...base, prefs: { push: false } })).toBe(false);
    expect(shouldAskForPush({ ...base, askedBefore: true })).toBe(false);
  });
});
