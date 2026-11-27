// Push notifications follow the plan (push is a Pro feature).
//  * Going Free: the account's Push setting is switched off (the server already sends no pushes on Free), and we
//    remember that the plan did it (push_off_by_plan), so a later upgrade can switch it back on.
//  * Going Pro: Push is switched back on if the plan had switched it off (never when the owner had switched it off
//    themselves), and each device is asked once whether to turn push on (the browser must ask for permission itself).
// plan_seen ("PRO" / "FREE") in notification_preferences tells which way the plan moved since the last visit.
// Kept free of React and the database so the rules can be tested (tests/pushPlanSync.test.js).

// What to change in notification_preferences, or null when nothing changes.
// `unsubscribeDevice`: this device should stop getting pushes (going Free).
export function planPushChanges(prefs, pushAllowed) {
  const p = prefs || {};
  if (!pushAllowed) {
    if (p.plan_seen === "PRO") {
      const wasOn = p.push !== false;
      return { changes: { plan_seen: "FREE", push: false, push_off_by_plan: wasOn }, unsubscribeDevice: true, wentFree: true };
    }
    return p.plan_seen === "FREE" ? null : { changes: { plan_seen: "FREE" }, unsubscribeDevice: false, wentFree: false };
  }
  if (p.plan_seen === "PRO") return null;
  const changes = { plan_seen: "PRO" };
  if (p.push_off_by_plan) { changes.push = true; changes.push_off_by_plan = false; }
  return { changes, unsubscribeDevice: false, wentFree: false };
}

// Whether to ask THIS device to turn push on: Pro, push works here, the browser hasn't blocked it, the device isn't
// already subscribed, the owner hasn't switched Push off, and this device hasn't been asked in this Pro period.
export function shouldAskForPush({ pushAllowed, supported, permission, subscribed, prefs, askedBefore }) {
  return !!pushAllowed && !!supported && permission !== "denied" && !subscribed && (prefs || {}).push !== false && !askedBefore;
}
