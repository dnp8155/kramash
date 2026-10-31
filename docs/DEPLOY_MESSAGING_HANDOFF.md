# Deploy handoff: client messaging (WhatsApp share, Gmail send, scheduled and automatic messages)

Plain-language summary: studios can message clients from an event. WhatsApp opens with a template filled in (free, every plan).
Gmail sends from the studio's own Gmail account (Pro), can be scheduled, and can run automatically (payment due, coming up,
thank you, anniversary). Kramasha only asks Google for the `gmail.send` permission and never reads mail.

Full background and how it works: `docs/GMAIL_SETUP.md`. Nothing here has been run against Supabase or Google yet; the
frontend builds, lints and passes `npm test`, and the Edge Function files pass a syntax check only (no Deno available when written).

## 1. Database (Supabase SQL editor, in this order)
1. `supabase/migrations/0055_message_log.sql`
2. `supabase/migrations/0056_messaging_automation.sql`

Both are safe to re-run. No new cron job: the existing 30-minute `generate-hourly-notifications` job now triggers
automation at the end of each `generateNotifications` run.

## 2. Edge Function secrets
| Name | Value |
|---|---|
| `GOOGLE_GMAIL_CLIENT_ID` | from the Google Cloud OAuth client |
| `GOOGLE_GMAIL_CLIENT_SECRET` | from the same client (never share in chat or commit) |
| `GMAIL_TOKEN_ENCRYPTION_KEY` | random 32+ chars (`openssl rand -hex 32`); changing it disconnects every Gmail |
| `APP_URL` (optional) | defaults to `https://www.kramasha.com` |
| `PRO_EXEMPT_EMAILS` (optional) | comma-separated owner emails treated as Pro; defaults to the two in `src/lib/planService.js` |

Existing secrets used: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
`supabase/setup_secrets.sh` now prompts for the three Gmail ones.

## 3. Edge Functions (`supabase/deploy_all.sh` lists them; all deploy with `--no-verify-jwt`)
New:
- `gmailAccount` (status / start / disconnect; signed-in, owner-only to change)
- `gmailOAuthCallback` (public; Google redirects here; protected by a signed `state`)
- `sendClientEmail` (signed-in; Pro; sends from the workspace Gmail; 300 emails per workspace per 24h)
- `trackEmail` (public; open pixel and signed click links)
- `runMessageAutomation` (cron / service-role only)

Changed, redeploy: `generateNotifications` (starts `runMessageAutomation` after a cron run).

Shared files used by the above: `_shared/gmail.ts`, `_shared/clientEmail.ts`, `_shared/messageRender.ts`.

## 4. Google Cloud (one-time)
- Enable the Gmail API.
- OAuth consent screen: name Kramasha; home `https://www.kramasha.com`; privacy `/privacy`; terms `/terms`;
  authorized domain `kramasha.com`; scope `https://www.googleapis.com/auth/gmail.send` only; audience External; add test users.
- Credentials: OAuth client ID, Web application. Authorized redirect URI (exact):
  `https://<SUPABASE-PROJECT-REF>.supabase.co/functions/v1/gmailOAuthCallback`
- Later, to open it to everyone: Publish app, then Prepare for verification (demo video, reason for the scope, privacy URL).
  While in Testing, only listed test users (max 100) can connect.

## 5. Frontend (deploy the app)
New files:
- `src/components/messaging/` : `SendMessageDialog.jsx`, `EventMessagesCard.jsx`, `MessageLogList.jsx`
- `src/components/settings/` : `ConnectionsSection.jsx`, `MessageTemplatesManager.jsx`, `AutomationManager.jsx`
- `src/hooks/useGmailAccount.js`
- `src/lib/` : `gmailService.js`, `messageLogService.js`, `messageTemplates.js`, `workspaceTime.js`

Changed:
- `src/pages/EventDetails.jsx` (Send message button), `src/pages/Preferences.jsx`, `src/pages/YourPlan.jsx`
- `src/components/preferences/PreferencesSections.jsx`, `src/components/events/EventProgressTab.jsx`
- `src/components/landing/Pricing.jsx`
- `src/lib/planService.js` (new plan flag `client_email_enabled`), `src/lib/supabaseClient.js` (MessageLog, ScheduledMessage entities)
- `src/lib/legalContent.js` (Privacy 2.9 + Limited Use statement; Terms 5.9 and acceptable use), `src/constants/faqContent.js`

## 6. Behaviour to know
- Free vs Pro: WhatsApp sharing, templates and WhatsApp reminders are free. Connecting Gmail and sending email
  (manual, scheduled, automatic) is Pro, checked in the app and again on the server.
- Times follow the workspace timezone (`workspaces.timezone`, default Asia/Kolkata).
- Automatic email is skipped, and a "Failed: Missing details" row logged, when a template needs a detail the record lacks.
- Rules live in `workspaces.display_preferences.message_automation`; custom templates in `display_preferences.message_templates`.
- Released quietly as 1.1.8.8 (package.json, appConfig.js, release notes: a plain "Bug fixes and improvements" entry; the new feature is not announced).

## 7. Smoke test after deploy
1. Preferences → Business → Connections: WhatsApp shows Ready; Gmail shows Pro/Upgrade on a Free workspace.
2. Event with a client: Send message → WhatsApp → opens WhatsApp; a "Shared" row appears under Progress → Messages.
3. Pro workspace: Connect Gmail (test user) → send an email to yourself → Sent folder has it; row shows Sent; click a link → "Link clicked".
4. Send later (a few minutes ahead) → appears as Scheduled; sent at that time (the cron runs every 30 min, so within ~30 min).
5. Switch on a WhatsApp rule → a reminder notification appears at the send time. Switch on an email rule → email goes out with an Auto tag.
