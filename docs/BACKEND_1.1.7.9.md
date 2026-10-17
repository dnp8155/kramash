# Backend changes for v1.1.7.9

**No database migrations. No new tables, columns, enum values or secrets.** Two edge functions to deploy.

| Function | Change | Public (no JWT)? |
|---|---|---|
| `submitProfileInquiry` | **New** | Yes, deploy with `--no-verify-jwt` like the other public functions |
| `getPublicInvoice` | **Modified** (one extra field in its response) | Yes (already is) |

```bash
supabase functions deploy submitProfileInquiry --no-verify-jwt
supabase functions deploy getPublicInvoice --no-verify-jwt
# or: bash supabase/deploy_all.sh   (submitProfileInquiry is already in the list)
```

Deploy the functions **before or together with** the frontend. Order matters only for the inquiry form: until `submitProfileInquiry` exists, the form on a public profile shows an error. The shared invoice link keeps working either way (it falls back to showing the logo).

---

## 1. `submitProfileInquiry` (new)

Lets a visitor of a published My Profile page (not signed in) send an inquiry. It becomes a **lead** for the workspace owner, plus a bell notification.

**Needs (all already exist):** env `SUPABASE_SERVICE_ROLE_KEY` (used for the admin client **and as the HMAC key** for the spam challenge); env `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and optionally `VAPID_SUBJECT` (for the push, same as `generateNotifications`); shared `sendPush.ts`; shared helpers `cors`, `supabaseClient`, `helpers`, `planEngine`; tables `workspaces`, `leads`, `notifications`; `lead_source = 'website'`; `notification_type = 'general'`; leads columns `event_dates`, `event_end_date`, `description`, `created_by_id`.

**Two request shapes** (POST JSON):

1. Challenge, sent when the form loads: `{ "action": "challenge", "slug": "<profile-slug>" }` returns `{ ts, sig, bits }`.
2. Submit: `{ slug, name, phone, email, event_type, event_date, event_end_date, event_dates[], message, website, ts, sig, nonce }`. `website` is a honeypot and must be empty.

**Conditions for a lead to be created:** profile published (`workspaces.public_profile_enabled`), owner switched the form on (`display_preferences.public_inquiry_enabled === true`), workspace not suspended, plan lead limit (`max_leads`) not reached.

**What it writes:** one `leads` row (`source='website'`, `status='new'`, `priority='warm'`, `created_by_id = workspace owner`, because leads are private to their creator), one `notifications` row for the owner, and a **web push** to the owner (`sendPushToUser`, opens `/leads`). Push follows the same rules as the lead reminders: Pro plan (`notifications_enabled`) and the owner has Push and Leads notifications on. It is best effort and never blocks the lead.

**Spam protection (layers):**
- Honeypot field.
- Server-signed challenge (HMAC-SHA256 of `slug.ts`) plus proof-of-work (SHA-256 of `slug.ts.nonce` must have 15 leading zero bits); expires after 30 min; single use; must be at least 4 s old (`TOO_FAST`, HTTP 429).
- Content rules: no links in the name or type, at most 1 link in the message, no repeated-character floods.
- Limits: 10 web inquiries per workspace per hour and 40 per day; 8 per visitor IP per hour; same phone or email, or same message text, saved once per 24 h.
- Dates: at most 15 days.

**Known limitation:** the per-IP counter and the "challenge already used" cache are in memory **per function instance**, so they are best effort only. If abuse appears, add edge-level rate limiting or a WAF rule in front of this function.

## 2. `getPublicInvoice` (modified)

Now also selects `display_preferences` from the workspace and returns `logo_on_invoice` (boolean). Logic: if `display_preferences.showLogoOnInvoice` is a boolean, use it; otherwise follow `showLogoOnQuotation !== false` (the old behaviour). Additive and backwards compatible. The shared invoice page hides the logo when it is `false`.

---

## How to test after deploying

1. **Challenge works**
   ```bash
   curl -s -X POST "$SUPABASE_URL/functions/v1/submitProfileInquiry" \
     -H "Content-Type: application/json" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
     -d '{"action":"challenge","slug":"<your-slug>"}'
   ```
   Expect `{ "ts": ..., "sig": "...", "bits": 15 }`.
2. **End to end:** in the app open My Profile, publish it, switch on the Inquiry form, save. Open `/p/<slug>`, send an inquiry. Expect a new lead in Leads (source Website, status New), a bell notification, a push notification on a Pro workspace whose owner has push enabled (tapping it opens Leads), and the form's success message.
3. **Multiple days:** send one with "Multiple days" and an untoggled day. The lead should show start, end and only the chosen days.
4. **Negative checks:**
   - Submitting within about 4 seconds of page load returns a "take a moment" message.
   - Re-sending the same request body returns an error (challenge already used).
   - Filling the hidden `website` field returns `{ok:true}` and creates no lead.
   - A workspace at 50 leads on Free shows "can't take online inquiries right now".
   - Profile unpublished, or form switched off: "This page isn't taking inquiries".
5. **Shared invoice logo:** Preferences, Types & Display, Shared Logo: turn **Invoices** off. Open a shared invoice link `/invoice/<token>`: no logo in the header or the invoice. Turn it on: logo is back.

## Rollback

Delete or redeploy the previous `getPublicInvoice`, and remove `submitProfileInquiry`. Nothing in the database needs undoing. Leads already created stay as normal leads.
