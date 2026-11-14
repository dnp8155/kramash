# Plan limits: enforce them in the database

## The problem

Free-plan caps (`max_events`, `max_team_members`, `max_services`, `max_leads`) are currently checked **only in the browser**.

- The create flows used to go through Edge Functions (`createTeamMember`, `createService`, `createEvent`, `createLead`). Those functions checked the cap with `resolvePlanContext` + `countUsage` + `checkResourceLimit` from `supabase/functions/_shared/planEngine.ts`.
- The app now creates records with direct inserts (`base44.entities.X.create` in `src/lib/supabaseClient.js`, e.g. `createTeamMember` in `src/lib/clientEdgeFunctions.js`). The Edge Functions are no longer on that path, so **nothing on the server enforces the caps**.
- Result: anyone who bypasses the UI (devtools, a script using their own session) can exceed the Free limits. The same applies to the "workspace suspended" check, which also lived only in those functions.

## Proposed fix

Add a `BEFORE INSERT` trigger on each capped table that rejects the insert when the workspace is at its limit. The database becomes the single source of truth, and the UI check stays as a friendly early warning.

| Table | Limit key | What counts toward the cap (matches `countUsage`) |
|---|---|---|
| `team_members` | `max_team_members` | rows with `status = 'active'` |
| `services` | `max_services` | rows with `status = 'active'` |
| `events` | `max_events` | all rows |
| `leads` | `max_leads` | all rows |

### Logic of the trigger function (same rules as `resolvePlanContext`)

1. Find the workspace's latest subscription in `workspace_subscriptions` (prefer `status = 'ACTIVE'`).
2. Pick the plan: that subscription's plan, unless it is expired (`expires_at` in the past while ACTIVE), in which case use the plan with `code = 'FREE'`. No subscription at all also means Free.
3. Read the cap from `plan_limits` (`plan_id`, `limit_key`, `enabled = true`). `limit_value` is TEXT, so cast it. A missing row means use the defaults in `FREE_DEFAULT_LIMITS` (events 5, team 3, services 5, leads 50), and a value `>= 999999` means unlimited.
4. Count existing rows for the workspace (rules in the table above). If `count >= cap`, `RAISE EXCEPTION` with a recognisable message such as `PLAN_LIMIT_REACHED:team_members`.
5. Also reject inserts when the subscription status is SUSPENDED ("This workspace is suspended").

### Things to decide with the dev

- **Exempt admins.** The client skips limits for two admin emails (`EXEMPT_ADMIN_EMAILS` in `src/lib/planService.js`). The trigger needs the same exemption, ideally via `is_platform_admin()` (already used in `0003_rls.sql`) instead of a hard-coded email list.
- **Existing over-limit workspaces.** The trigger only blocks new inserts, so workspaces already over the cap keep their data. Decide whether that is acceptable.
- **Restoring inactive rows.** Team members and services count only when `status = 'active'`. Setting an inactive row back to active is an UPDATE, so also add a `BEFORE UPDATE` check (only when status changes to `'active'`), or users can bypass the cap by toggling status.
- **Race conditions.** Two inserts at the same instant can both pass a count check. For a hard guarantee take a per-workspace advisory lock inside the trigger (`pg_advisory_xact_lock(hashtext(workspace_id::text))`).
- **Bulk inserts.** Imports (`bulkCreate`, `src/lib/dataTransferService.js`) insert many rows. The trigger fires per row, so an import will stop part-way at the cap. Confirm that is the desired behaviour.
- **Performance.** The trigger runs a count per insert. The `workspace_id` columns should be indexed (check `0002_tables.sql` / index migrations).
- **Security.** Make the function `SECURITY DEFINER` with a fixed `search_path`, so it can read `plan_limits` and `workspace_subscriptions` regardless of the caller's RLS.

### Client changes needed afterwards

The forms currently show a message if `err.data.error === "PLAN_LIMIT_REACHED"` (see `TeamMemberForm.jsx`, `ServiceForm.jsx`). A database exception arrives as `err.message` instead, so map the new message text to the same friendly "Upgrade to Pro" message.

## Rollout

1. Write the migration as the next file in `supabase/migrations/` (e.g. `00xx_plan_limit_triggers.sql`).
2. Test on a staging project or a copy: Free workspace at the cap (insert must fail), Pro workspace (must succeed), expired Pro (acts as Free), exempt admin (must succeed), an import near the cap.
3. Apply to production, then update the client error mapping.
