# Notifications — how they work today, and how to make them Pro-only and preference-driven

Audience: developers on Kramasha. Everything below was checked against the code in this repo (file paths are given so you can jump straight to them). Items marked **GAP** are things that do not work, or do not work the way the product intends, and are the actual work to do.

---

## 1. What we want

For **Pro** workspaces, the owner gets notifications for:

| Event | Example |
|---|---|
| Quotation accepted | "Quotation accepted: Sharma Wedding" |
| Event is upcoming | "Tomorrow: Sharma Wedding" |
| Payment reminder | "Payment due today: Advance" / "Payment overdue" |
| Subscription reminder | "Pro plan expiring soon" / "Pro plan expired" |
| (later) invoice paid, new lead, lead follow-up due, team payment due … |

Each one is shown **in the app (bell)** and as a **push notification** on the phone/desktop, **but only the kinds the user left switched on in Preferences → Notifications**.

Free workspaces keep the in-app bell reminders; **push is the Pro feature** (plan limit `notifications_enabled`: FREE = false, PRO = true — `supabase/migrations/0028_plan_limits_and_pricing.sql`).

---

## 2. The three moving parts

```
                    ┌──────────────────────────────────────────┐
  PRODUCERS         │  create a row in `notifications`         │   DELIVERY
  (who decides)     │  (workspace_id, user_id, type, title,    │
                    │   message, related_entity_*, read)       │
 ┌───────────────┐  └───────────────┬──────────────────────────┘  ┌──────────────────────┐
 │ cron: hourly  │──► generateNotifications (edge fn) ───────────►│ in-app bell          │
 │ app open      │──► notificationService.js (client) ───────────►│  (reads the table)   │
 │ client signs  │──► signQuotation (edge fn)                     ├──────────────────────┤
 │ row created / │──► SQL trigger notify_workspace_crud           │ web push             │
 │ deleted       │                                                │  sendPushToUser()    │
 └───────────────┘                                                │  → service worker    │
                                                                  └──────────────────────┘
        ▲                                   ▲
        │ reads                             │ reads
   profiles.notification_preferences   plan limit notifications_enabled
   (what the user wants)               (what the plan allows)
```

Rule of thumb for every producer: **(1) is the recipient the workspace owner? (2) is the category switched on? (3) is in-app on? → insert row. (4) is the plan Pro? (5) is push on? → send push.**

---

## 3. The preferences contract (what "fetch from Preferences" means)

Stored on the user: `profiles.notification_preferences` (JSONB). UI: `src/components/settings/NotificationSection.jsx` (Preferences → Notifications). **A missing key always counts as ON.**

| Key | Meaning | Default | Read by |
|---|---|---|---|
| `in_app` | Master switch for the bell. Off → nothing is created at all. | `true` | client `notificationService.js`, `generateNotifications`, `signQuotation`, SQL trigger |
| `push` | Master switch for push on the user's devices. | `true` | `generateNotifications`, `dispatchPushNotification` |
| `events` | Event/project reminders **and** "event created/deleted" notices | `true` | all four producers |
| `quotations` | "Quotation accepted" **and** quotation created/deleted notices | `true` | `signQuotation`, SQL trigger |
| `invoices` | Payment milestone reminders **and** invoice/transaction notices | `true` | `generateNotifications`, client, SQL trigger |
| `billing` | Subscription expiring / expired | `true` | `generateNotifications`, client |
| `reminder_days` | How many days ahead to remind: `"1"`, `"3"`, `"7"` | `"3"` | `generateNotifications`, client |
| `reminder_time` | Hour of day (IST) the cron delivers reminders, e.g. `"10:00"` | `"10:00"` | `generateNotifications` (cron only) |
| `reminder_dot` | Red dot on the Reminders bell on the Events page | `true` | Events page (UI only) |

Device-level state is separate: a push only reaches a device that has a row in `push_subscriptions` (created by the "Push Notifications" toggle).

**To add a new category** (e.g. "Leads"): add a key to `DEFAULT_PREFS` and `CATEGORIES` in `NotificationSection.jsx`, then check `prefs.<key> !== false` in every producer that creates that kind of notification. Nothing else is needed — preferences are free-form JSON, no migration.

---

## 4. Catalogue — what exists today

| Notification | `type` | Produced by | Preference checked | Push today? | Dedupe |
|---|---|---|---|---|---|
| Quotation accepted | `quotation_accepted` | `supabase/functions/signQuotation` (when the client signs) | `in_app`, `quotations` | **No** (GAP 2) | none (one per signing) |
| Event upcoming | `event_reminder` | `supabase/functions/generateNotifications` (hourly cron) **and** `src/lib/notificationService.js` (app open) | `in_app`, `events`, `reminder_days`, `reminder_time` | Yes, if `push !== false` (GAP 1: not plan-checked) | server: one per user+event, ever; client: one *unread* per user+event |
| Payment due / overdue | `payment_due` | same two | `in_app`, `invoices`, `reminder_days` | Yes (same GAP 1) | one per user+milestone |
| Subscription expiring (≤7 days) / expired | `subscription_expiring` / `subscription_expired` | same two | `in_app`, `billing` | **No** (GAP 3) | one per user+subscription |
| "X created / deleted" | `general` | SQL trigger `notify_workspace_crud` (`0031_notification_scope.sql`) | `in_app`, `events`/`quotations`/`invoices` | Via trigger 0032 — **broken** (GAP 4) | 24 h per entity |

Audience for **all** of them: the **workspace owner only**, never the person who made the change (`0031`, and `recipients` in `generateNotifications`).

Where things live:

- Preferences screen: `src/components/settings/NotificationSection.jsx`
- Bell + list: `src/components/common/NotificationBell.jsx`, `src/hooks/useNotifications.js`
- Client generator: `src/lib/notificationService.js` (runs 4 s after app load — `AppLayout.jsx`; re-runs on realtime changes — `useRealtimeSync.js`)
- Server generator: `supabase/functions/generateNotifications/index.ts`
- Push send: `supabase/functions/_shared/sendPush.ts` (service-level), `supabase/functions/dispatchPushNotification` (needs a signed-in user)
- Push subscribe (device): `src/lib/pushNotifications.js` → edge fns `getPushConfig`, `registerPushSubscription` → table `push_subscriptions`
- Service worker: `public/sw.js` (`push` and `notificationclick` handlers)
- Plan limits: `supabase/functions/_shared/planEngine.ts` (`resolvePlanContext(workspaceId).limits`), client `src/lib/planService.js`
- Cron: `supabase/migrations/0033_cron_generate_notifications.sql`, `0034_cron_reminders_auth.sql`

---

## 4b. How "Pro only" works today (client-only)

`NotificationSection.jsx → handlePushToggle` calls `checkFeature("notifications_enabled", …)` before it lets a Free user switch push on. That is the **only** place the plan is checked. Nothing on the server looks at `notifications_enabled`.

---

## 5. GAPS to fix (in priority order)

### GAP 1 — Push is not enforced as Pro on the server
`generateNotifications` pushes whenever `prefs.push !== false`. A workspace that was Pro, subscribed a device, then lapsed to Free keeps receiving push; and a Free user who has a subscription row (older build, or direct API call) gets push too.

Fix — resolve the plan once per workspace and gate the push helper:

```ts
// generateNotifications/index.ts — inside the `for (const currentWsId …)` loop, next to resolvePlanContext()
const planCtx = await resolvePlanContext(currentWsId);          // already called further down; move it up
const pushAllowed = planCtx.limits?.notifications_enabled === true;

const pushIfEnabled = async (prefs, userId, title, message, entityType, entityId) => {
  if (!pushAllowed || prefs.push === false) return;              // <- plan gate added
  …
};
```

Also make `dispatchPushNotification` refuse when the target's workspace is not Pro (it currently only checks the user's `push` pref).

### GAP 2 — "Quotation accepted" never sends a push
`signQuotation` only inserts the in-app row. Add the push after the insert (same prefs + plan checks). Using the helper from §6:

```ts
await notifyOwner({
  workspaceId: q.workspace_id, ownerId,
  category: "quotations", type: "quotation_accepted",
  title: `Quotation accepted: ${q.project_title || q.quotation_number}`,
  message: `${signed_by_name.trim()} signed and accepted quotation ${q.quotation_number}.`,
  entityType: "quotation", entityId: q.id,
});
```

### GAP 3 — Subscription reminders have no push, and fire only once
Pushing them is the same one-line change (`notifyOwner` with category `billing`). Today the dedupe key is `user:type:subscription_id`, so the "expiring" reminder is sent once, the first time it is within 7 days. Recommended: staged reminders at 7, 3 and 1 day — put the stage in the key (`subscription_expiring:<id>:7d`).

### GAP 4 — The "push on every new notification" trigger cannot work
`0032_push_notification_webhook.sql` creates trigger `trg_push_on_notification` which calls `dispatchPushNotification` with the **anon key**. That function requires a signed-in user (`getUserFromRequest`) → it answers **401**, so nothing is pushed. The cron path works only because it calls `sendPushToUser` directly.

Pick one (A recommended):

- **A.** Drop the trigger (`DROP TRIGGER trg_push_on_notification ON notifications;`) and send the push from the producer (the `notifyOwner` helper below). One code path, easy to gate by plan/preferences.
- **B.** Keep the trigger and let `dispatchPushNotification` accept the cron/service secret (like `generateNotifications.isCronRequest`), then add the Pro + `push` checks there.

### GAP 5 — Tapping a push always opens /dashboard
`public/sw.js → notificationclick` navigates to `data.url`, but the payloads only carry `entity_type` / `entity_id`. Add a `url` when sending, e.g. `/events/<id>`, `/quotation/<id>`, `/financial`, `/plan`:

```ts
const urlFor = (t: string, id: string) =>
  t === "event" ? `/events/${id}` : t === "quotation" ? `/quotation/${id}` :
  t === "milestone" ? `/financial` : t === "subscription" ? `/plan` : `/dashboard`;
await sendPushToUser(userId, title, message, { entity_type, entity_id, url: urlFor(entity_type, entity_id) });
```

### GAP 6 — Two generators produce the same reminders
`src/lib/notificationService.js` (client) and `generateNotifications` (server) both create event/payment reminders with slightly different titles and different dedupe (client: unread only; server: ever). Result: possible duplicates, and the client one never pushes. Recommendation: keep the **server** generator as the source of truth and let the client only read (and call the server function once on open for freshness). Until then, keep titles/dedupe keys identical.

### GAP 7 — Secrets are committed in a migration
`supabase/migrations/0034_cron_reminders_auth.sql` contains a literal cron secret and the anon JWT. **Rotate `CRON_SECRET`** (`supabase secrets set CRON_SECRET=…`), redeploy `generateNotifications`, and change the migration to read the value from Supabase Vault / `current_setting`, not a string in git. (The anon key is public by design; the cron secret is not.)

### Smaller items
- `reminder_time` is interpreted in **IST** only (`generateNotifications`: `Asia/Kolkata`). Store the workspace timezone if you have users elsewhere.
- Reminders are sent once per event ("within N days"). If you want "7 days **and** 1 day before", put the stage in the dedupe key.
- When a Pro plan lapses, stop pushing (GAP 1) and optionally delete the user's `push_subscriptions` rows.
- `notification_type` enum (`0001_enums.sql` + `0026`) must get a new value for each new type: `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_paid';`.

---

## 6. Recommended design: one helper every producer uses

Create `supabase/functions/_shared/notifyOwner.ts`. Producers stop re-implementing the checks.

```ts
import { supabaseAdmin } from "./supabaseClient.ts";
import { resolvePlanContext } from "./planEngine.ts";
import { sendPushToUser } from "./sendPush.ts";

type Category = "events" | "quotations" | "invoices" | "billing";

export async function notifyOwner(o: {
  workspaceId: string; ownerId: string; category: Category; type: string;
  title: string; message: string; entityType: string; entityId: string; dates?: string[];
  dedupeKey?: string;                       // e.g. "event_reminder:<id>:1d"
}) {
  // 1. Preferences (what the user wants)
  const { data: p } = await supabaseAdmin.from("profiles").select("notification_preferences").eq("id", o.ownerId).single();
  const prefs = p?.notification_preferences || {};
  if (prefs.in_app === false || prefs[o.category] === false) return { created: false };

  // 2. Dedupe
  if (o.dedupeKey) {
    const { data: dup } = await supabaseAdmin.from("notifications").select("id")
      .eq("user_id", o.ownerId).eq("type", o.type).eq("related_entity_id", o.entityId)
      .eq("dedupe_key", o.dedupeKey).limit(1);      // add a `dedupe_key text` column, or encode it in related_entity_id
    if (dup?.length) return { created: false };
  }

  // 3. In-app row (always, for every plan)
  await supabaseAdmin.from("notifications").insert({
    workspace_id: o.workspaceId, user_id: o.ownerId, type: o.type, title: o.title, message: o.message,
    related_entity_type: o.entityType, related_entity_id: o.entityId, related_dates: o.dates ?? [], read: false,
  });

  // 4. Push — only for Pro workspaces, and only if the user left Push on
  const plan = await resolvePlanContext(o.workspaceId);
  if (plan.limits?.notifications_enabled === true && prefs.push !== false) {
    await sendPushToUser(o.ownerId, o.title, o.message,
      { entity_type: o.entityType, entity_id: o.entityId, url: urlFor(o.entityType, o.entityId) });
  }
  return { created: true };
}
```

Then:

- `signQuotation` → `notifyOwner({ category: "quotations", type: "quotation_accepted", … })`
- `generateNotifications` → replace the three insert+push blocks with `notifyOwner` calls (keep the cron hour check and recipients logic).
- Drop trigger 0032 (GAP 4-A).
- New notification kinds later (invoice paid, lead follow-up…) = one `notifyOwner` call at the place that event happens, plus a category in Preferences.

---

## 7. Step-by-step task list for the developer

1. Add `_shared/notifyOwner.ts` (§6) and a shared `urlFor()`.
2. `generateNotifications`: resolve the plan up front; use `notifyOwner` for events, payments, subscription (with staged keys 7/3/1 for subscription).
3. `signQuotation`: use `notifyOwner` (quotation accepted → push).
4. `dispatchPushNotification`: add the Pro check (and keep `push` pref check).
5. Drop trigger `trg_push_on_notification` (new migration `0042_drop_push_trigger.sql`).
6. `sw.js` already honours `data.url` — verify after step 1 that tapping opens the right page.
7. Client: remove push-less duplicates in `notificationService.js` (or align titles/keys), keep the bell reading from the table.
8. Rotate `CRON_SECRET`, remove the literal secret from migration 0034, redeploy `generateNotifications`.
9. Optional: a "Notification history" or per-device list in Preferences; "quiet hours".

---

## 8. Config & deployment checklist

| Item | Where |
|---|---|
| VAPID keys | Edge Function secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`getPushConfig` returns the public key to the app) |
| Cron secret | `CRON_SECRET` secret; header `x-cron-secret` from pg_cron (`0034`) |
| Cron schedule | `generate-hourly-notifications`, top of every hour; each user's reminders go out only in their `reminder_time` hour (IST) |
| Extensions | `pg_cron`, `pg_net` |
| Deploy functions | `supabase functions deploy generateNotifications signQuotation dispatchPushNotification registerPushSubscription getPushConfig` |
| Service worker | `public/sw.js` — `push` shows the notification, `notificationclick` opens `data.url` |
| HTTPS + installed PWA | Required for push on iOS (Add to Home Screen first) |

---

## 9. How to test

1. **Pro plan, push on:** Preferences → Notifications → turn on Push on a real device → "Send a test notification" (uses `dispatchPushNotification`).
2. **Quotation accepted:** open a finalized quotation's client link, sign it → a bell item and (after GAP 2) a push appear. Turn the "Quotations" category off → neither appears.
3. **Event upcoming:** create an event starting tomorrow, set "Remind me: 3 days", set the time to the current IST hour, call `generateNotifications` (curl with the cron secret) → bell + push. Turn "Events & projects" off → nothing.
4. **Payment reminder:** add a milestone due today → "Payment due today". Turn "Payments & invoices" off → nothing.
5. **Subscription:** set a Pro subscription's `expires_at` to 5 days from now → "Pro plan expiring soon".
6. **Free plan:** the same flows create bell items but **no push** (after GAP 1).
7. **Preferences matrix:** `in_app=false` → no bell and no push; `push=false` → bell only.
8. **Tap a push** → the app opens the right page (after GAP 5).
