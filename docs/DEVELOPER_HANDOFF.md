# Developer handoff, version 1.2.0.1 (updated 2026-11-14)

Everything up to and including the 1.2.0.0c zip was deployed (confirmed 14 Nov 2026). This list is only what is new
since then: reminder notifications. No database migrations.

## Problem being fixed
Reminder pushes (upcoming event, lead follow-up, payment due, on-the-day event reminder) only arrived after the owner
opened the app. New-lead pushes were fine (they are sent straight away, not by the cron).

1. **The cron job was broken (already fixed by hand, nothing to deploy).** On 13 Nov ~20:25 IST the reminder cron was
   re-created as job 7 with a broken command (every run "syntax error at or near url") and an hourly schedule.
   Fixed in the SQL editor on 14 Nov: job 7 removed, `generate-hourly-notifications` re-created as **job 10**,
   `*/30 * * * *`, anon key in Authorization + `x-cron-secret` header, `timeout_milliseconds := 60000`.
   Do not re-run migrations 0033/0034 and do not edit the job in the dashboard cron form (it caps the timeout at 5 s).
2. **The function never finished its cron scan.** Since 1.2.0.0 it answered 202 at once and scanned only in the
   background (`EdgeRuntime.waitUntil`); no cron run created a reminder after 12 Nov 09:00 and no
   "generateNotifications cron run" log line was ever written. Fixed in the code below.

## Deploy, in this order (1 → 2)

### Step 1. Edge function
From the `kramash-main` folder with the CLI (so `_shared/*` is bundled), usual flags (e.g. `--no-verify-jwt`):

- `agentChat` (the assistant now knows the 1.2.0.1 release notes: `_shared/releaseNotes.ts` was regenerated).
- `generateNotifications` (URGENT)
  - The cron call now waits for the scan and answers **200** with the counts; `waitUntil` is kept only as a safety
    net in case the HTTP call disconnects. The automatic-messages kick (`runMessageAutomation`) still runs on the side.
  - Scans up to 8 workspaces at a time instead of one by one.
  - Log line "generateNotifications cron run" now also has `scanned` (workspaces finished) and `ms` (run time).
  - Includes `_shared/eventDayReminder.ts`: "N minutes before the start" now goes out at the last half-hour check at or
    before (start − N), so it is never less than N minutes early; a missed check is caught up until the start.
    `tests/eventDayReminder.test.js` passes. The function itself is syntax-checked only.

### Step 2. Frontend (last)
Whole `kramash-main` build, deployed as usual. Preferences → Notifications now shows a brief "✓ Saved" after a change is
stored, and "Next check: today/tomorrow at …" in the workspace's timezone (rounded up to the next :00 / :30), plus a
note for the "before it starts" options. Lead follow-ups are now named in the Reminder Timing card.
Also: the small coloured dot before the label on the top stat cards (Dashboard, Events, Team, Clients, Leads, Invoices,
Quotation) is removed, because users mixed it up with status dots. The coloured icon on the right stays.

## Check after deploying
In the SQL editor, after the next :00 / :30:

```sql
select status_code, left(content::text, 160) as content, created at time zone 'Asia/Kolkata' as created_ist
from net._http_response order by created desc limit 3;
```

Expect **200** with `"scanned"` equal to `"workspaces"` (not 202 / `"started":true`). The next day, with the app closed,
the owner's reminder push should arrive at the chosen time, and new `notifications` rows should be created at
:00 / :30 (e.g. 09:00:xx), not at app-open times.
