# Messaging: Gmail, scheduled and automatic messages

What it is
- WhatsApp: free on every plan. Opens WhatsApp with the template filled in. Nothing to connect.
- Gmail (Pro): each workspace connects its own Gmail. Emails are sent from their address and land in their Sent folder.
  Kramasha asks Google for ONE permission, `gmail.send`. It can send only; it cannot read, list or delete mail.
- Send later, and automatic rules (payment due, coming up, thank you, anniversary): Pro for email. A WhatsApp rule
  only creates a notification ("Send payment reminder on WhatsApp"), which is free.

## Deploy checklist (in this order)

1. Run the migrations in the Supabase SQL editor: `0055_message_log.sql`, then `0056_messaging_automation.sql`.
2. Google Cloud (same project as sign-in is fine, but use a NEW OAuth client):
   - Enable the Gmail API.
   - OAuth consent screen: app name Kramasha, home page `https://www.kramasha.com`, privacy `https://www.kramasha.com/privacy`,
     terms `https://www.kramasha.com/terms`, authorized domain `kramasha.com`, scope `https://www.googleapis.com/auth/gmail.send`.
   - Credentials → OAuth client ID → Web application. Authorized redirect URI (exact):
     `https://<PROJECT-REF>.supabase.co/functions/v1/gmailOAuthCallback`
3. Edge Function secrets (Supabase → Edge Functions → Secrets, or `supabase/setup_secrets.sh`):
   - `GOOGLE_GMAIL_CLIENT_ID`
   - `GOOGLE_GMAIL_CLIENT_SECRET`
   - `GMAIL_TOKEN_ENCRYPTION_KEY` — a random string of 32+ characters (`openssl rand -hex 32`). Keep it: changing it
     disconnects every connected Gmail.
   - optional `APP_URL` (defaults to `https://www.kramasha.com`) — where Google sends people back to.
   - optional `PRO_EXEMPT_EMAILS` — comma-separated owner emails treated as Pro without a subscription (defaults to
     the two in `src/lib/planService.js`).
4. Deploy the functions (`supabase/deploy_all.sh`). New ones: `gmailAccount`, `gmailOAuthCallback`, `sendClientEmail`,
   `trackEmail`, `runMessageAutomation`. Also redeploy `generateNotifications` (it now starts the automation run).
5. Deploy the app.
6. In Preferences → Business → Connections: Connect Gmail, send a test from an event, then switch on a rule.

No new cron job is needed. The existing 30-minute `generate-hourly-notifications` job calls `runMessageAutomation`
at the end of each run (service-role / CRON_SECRET only).

## Google verification
While the consent screen is in Testing, only listed test users can connect (up to 100) and Google shows an
"unverified app" warning. To open it to everyone: Publish app → Prepare for verification. Google will want a demo
video of the Connect Gmail flow and an email being sent, the reason for `gmail.send` ("users send payment and event
reminders to their own clients from their own Gmail"), and the privacy policy (it already carries the Google API
Services User Data Policy / Limited Use statement, section 2.9). `gmail.send` is a "sensitive" scope; it does not need
the paid security assessment that "restricted" (read) scopes need.

## How it works
- `messaging_accounts` holds the connection. The refresh token is AES-GCM encrypted with `GMAIL_TOKEN_ENCRYPTION_KEY`;
  the table has row security and no policies, so the browser can never read it. The app asks `gmailAccount` for status.
- `sendClientEmail` (a person pressed Send): checks membership + Pro, sends to the client's email on file only, writes
  `message_log`. Limit 300 emails per workspace per 24h.
- Tracking: every email has an invisible pixel ("Likely opened") and signed links ("Link clicked") served by
  `trackEmail`. Open tracking is only a hint (Apple Mail and image blockers); a click is the reliable signal.
- Rules live in `workspaces.display_preferences.message_automation`; each rule carries a copy of its template text
  (refreshed whenever templates are saved) because the server has no template list. Sent once per item: a unique
  `dedupe_key` on `message_log` (and on the WhatsApp reminder notification) stops repeats.
- If a template has a `{detail}` the record cannot fill (for example `{venue}`), the automatic email is NOT sent; a
  "Failed: Missing details" row is logged instead.
- If Google reports the access was removed or expired, the connection is marked `needs_reconnect` and Preferences
  shows Reconnect Gmail.

## Time zone
Rules and scheduled messages follow each workspace's own timezone (Preferences → Profile & Workspace → Timezone, the same one the Dashboard clock uses; India time if none is set). "Send at 10:00" means 10:00 in that zone, and a scheduled time typed in the Send message sheet is read in that zone too, not the device's.
