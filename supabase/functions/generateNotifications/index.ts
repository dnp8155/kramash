import { withCors } from "../_shared/cors.ts";
// generateNotifications — Scan workspace data + generate in-app notifications.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { resolvePlanContext, verifyWorkspaceMembership } from "../_shared/planEngine.ts";
import { formatDatesList } from "../_shared/helpers.ts";
import { sendPushToUser } from "../_shared/sendPush.ts";

// The hourly cron job (migration 0033/0034) is not a signed-in user. It authenticates with the service role key
// or the CRON_SECRET header, and is the only caller allowed to scan every workspace.
function isCronRequest(req: Request) {
  const bearer = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  if (serviceKey && bearer === serviceKey) return true;
  return !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
}

Deno.serve(withCors(async (req) => {
  try {
    const isCron = isCronRequest(req);
    const user = isCron ? null : await getUserFromRequest(req);
    if (!isCron && !user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body?.workspace_id;

    let workspacesToScan: string[] = [];
    if (isCron) {
      const { data: allWs } = await supabaseAdmin.from("workspaces").select("id");
      workspacesToScan = (allWs || []).map(w => w.id);
    } else {
      // A signed-in user (app open) can only scan a workspace they belong to.
      if (!workspaceId) return Response.json({ error: "workspace_id required" }, { status: 400 });
      workspacesToScan = [workspaceId];
    }

    let created = 0, skipped = 0, pushed = 0;
    const now = new Date();
    // Everything is judged in IST (the reminder time in Preferences is "Time of day (IST)"). Using UTC dates
    // would make "today" wrong between midnight and 5:30 AM IST.
    const istNow = new Date(now.getTime() + 330 * 60 * 1000);
    const todayISO = istNow.toISOString().split("T")[0];
    const addDaysISO = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().split("T")[0];
    const in7days = addDaysISO(todayISO, 7);
    const tomorrowISO = addDaysISO(todayISO, 1);
    const nowMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    // The hourly cron may run late or skip a run, so a reminder still goes out within this many minutes after the
    // chosen time. (Each reminder is created once, so a late run can never double up.)
    const CATCH_UP_MINUTES = 180;

    for (const currentWsId of workspacesToScan) {

      const planCtx = await resolvePlanContext(currentWsId);
      const pushAllowed = planCtx.limits?.notifications_enabled === true;

      const urlFor = (t: string, id?: string) =>
        t === "event" ? `/events/${id}` : t === "leads" ? `/leads` : t === "quotation" ? `/quotation/${id}` :
        t === "milestone" ? `/financial` : t === "subscription" ? `/plan` : `/dashboard`;

      // Push goes out only for users who left Push on AND workspace has Pro plan. Pushes are queued and sent once
      // every reminder of this workspace is saved, so each one carries the same final unread count for the app icon
      // badge (sending as we go would give the first push a lower number than the last, and pushes can arrive out of order).
      const pushQueue: Array<() => Promise<void>> = [];
      const pushIfEnabled = (prefs: any, userId: string, title: string, message: string, entityType: string, entityId: string) => {
        if (!pushAllowed || prefs.push === false) return;
        pushQueue.push(async () => {
          try {
            const r = await sendPushToUser(userId, title, message, {
              entity_type: entityType,
              entity_id: entityId,
              url: urlFor(entityType, entityId)
            }, `${entityType}:${entityId}`, currentWsId);
            pushed += r.sent;
          } catch { /* push is best-effort; the in-app notification already exists */ }
        });
      };

      // Saves a reminder once. The database rejects a second row with the same dedupe_key (migration 0054), so if
      // the hourly cron and an app-open scan run together only one of them gets true here, and only that one pushes.
      const saveReminder = async (row: Record<string, unknown>, dedupeKey: string) => {
        const { data, error } = await supabaseAdmin.from("notifications")
          .upsert({ ...row, dedupe_key: dedupeKey }, { onConflict: "workspace_id,user_id,dedupe_key", ignoreDuplicates: true })
          .select("id");
        if (!error) return (data || []).length > 0;
        // Migration 0054 not run yet: plain insert, the in-memory keys below still protect a single run.
        const { error: plainError } = await supabaseAdmin.from("notifications").insert(row);
        return !plainError;
      };

      const { data: members } = await supabaseAdmin.from("workspace_members").select("*").eq("workspace_id", currentWsId).eq("status", "active");
      if (!members || members.length === 0) continue;

      const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", currentWsId).single();
      // Notifications are for the workspace owner only — nothing about the workspace goes to other members.
      const recipients = (members || []).filter((m) => m.user_id === workspace?.owner_user_id || m.role === "owner");
      const category = workspace?.business_category || "OTHER";
      const isProjectCategory = category === "ARCHITECTURE" || category === "OTHER";
      const workSingular = workspace?.custom_work_label_singular?.trim() || (isProjectCategory ? "Project" : "Event");
      const reminderTomorrow = isProjectCategory ? `${workSingular} starts tomorrow` : `${workSingular} tomorrow`;
      const reminderComing = isProjectCategory ? `${workSingular} coming up` : `${workSingular} coming up`;
      const reminderVerb = isProjectCategory ? "starts on" : "is scheduled for";

      const { data: existingNotifs } = await supabaseAdmin.from("notifications").select("*").eq("workspace_id", currentWsId).order("created_at", { ascending: false }).limit(1000);
      const existingKeys = new Set((existingNotifs || []).map((n) => `${n.user_id}:${n.type}:${n.related_entity_id}`));

      const { data: events } = await supabaseAdmin.from("events").select("*").eq("workspace_id", currentWsId).eq("status", "upcoming").order("start_date", { ascending: true }).limit(200);

      const memberNames: Record<string, string> = {};
      const memberPrefs: Record<string, any> = {};
      

      for (const m of recipients) {
        const { data: u } = await supabaseAdmin.from("profiles").select("full_name, notification_preferences").eq("id", m.user_id).single();
        if (u?.full_name) memberNames[m.user_id] = u.full_name;
        
        const prefs = u?.notification_preferences || { in_app: true, push: true, events: true, quotations: true, invoices: true, reminder_days: "3", reminder_time: "10:00" };

        // Preferences → Notifications → "Time of day (IST)", e.g. "09:30".
        const [ph, pm] = String(prefs.reminder_time || "10:00").split(":");
        const prefMinutes = (parseInt(ph, 10) || 0) * 60 + (parseInt(pm, 10) || 0);

        // Nothing is created before the chosen time. The cron sends from that time until the catch-up window ends.
        // A signed-in scan (app opened) only fills in what is already due, so opening the app early in the day
        // never produces reminders ahead of the chosen time.
        const pastTime = nowMinutes >= prefMinutes;
        const withinWindow = nowMinutes < prefMinutes + CATCH_UP_MINUTES;
        if (!pastTime || (isCron && !withinWindow)) {
          prefs.skip_this_run = true;
        }

        memberPrefs[m.user_id] = prefs;
      }

      // Settled events (owner closed their dues) get no event or payment reminders.
      const { data: settledRows } = await supabaseAdmin.from("events").select("id").eq("workspace_id", currentWsId).eq("settled", true).limit(1000);
      const settledIds = new Set((settledRows || []).map((r: any) => r.id));

      for (const ev of events || []) {
        if (settledIds.has(ev.id)) continue;
        const evDates = (ev.event_dates && ev.event_dates.length > 0) ? ev.event_dates : (ev.start_date ? [ev.start_date] : []);
        if (evDates.length === 0) continue;
        const firstDate = evDates.slice().sort()[0];
        
        for (const m of recipients) {
          const prefs = memberPrefs[m.user_id];
          if (prefs.events === false || prefs.in_app === false || prefs.skip_this_run) { skipped++; continue; }
          
          const reminderDays = parseInt(prefs.reminder_days || "3", 10);
          const thresholdDate = addDaysISO(todayISO, reminderDays);
          
          // If event is coming up within the user's preferred reminder window (and is in the future)
          if (firstDate >= todayISO && firstDate <= thresholdDate) {
            const key = `${m.user_id}:event_reminder:${ev.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            
            const isTomorrow = firstDate <= tomorrowISO;
            const evTitle = isTomorrow ? reminderTomorrow : reminderComing;
            const evMessage = `"${ev.title}" ${reminderVerb} ${formatDatesList(evDates)}${ev.venue ? ` at ${ev.venue}` : ""}.`;
            existingKeys.add(key);
            const saved = await saveReminder({
              workspace_id: currentWsId, user_id: m.user_id, type: "event_reminder",
              title: evTitle, message: evMessage,
              related_entity_type: "event", related_entity_id: ev.id, related_dates: evDates, read: false
            }, `event_reminder:${ev.id}`);
            if (!saved) { skipped++; continue; }
            pushIfEnabled(prefs, m.user_id, evTitle, evMessage, "event", ev.id);
            created++;
          }
        }
      }

      // Lead follow-ups: open leads whose follow-up date is today or already past. One reminder per lead per
      // follow-up date, so moving the date later reminds again.
      const { data: dueLeads } = await supabaseAdmin.from("leads")
        .select("id, name, event_type, next_followup_date")
        .eq("workspace_id", currentWsId)
        .not("next_followup_date", "is", null)
        .lte("next_followup_date", todayISO)
        .not("status", "in", "(won,lost)")
        .limit(200);
      const leadKeys = new Set((existingNotifs || [])
        .filter((n) => n.related_entity_type === "leads")
        .map((n) => `${n.user_id}:${n.related_entity_id}:${(n.related_dates || [])[0] || ""}`));
      for (const lead of dueLeads || []) {
        for (const m of recipients) {
          const prefs = memberPrefs[m.user_id];
          if (prefs.leads === false || prefs.in_app === false || prefs.skip_this_run) { skipped++; continue; }
          const key = `${m.user_id}:${lead.id}:${lead.next_followup_date}`;
          if (leadKeys.has(key)) { skipped++; continue; }
          const overdue = lead.next_followup_date < todayISO;
          const title = `Follow up with ${lead.name}`;
          const message = `${lead.event_type ? `${lead.event_type} lead · ` : ""}Follow-up ${overdue ? `was due on ${formatDatesList([lead.next_followup_date])}` : "is due today"}.`;
          leadKeys.add(key);
          const saved = await saveReminder({
            workspace_id: currentWsId, user_id: m.user_id, type: "general",
            title, message,
            related_entity_type: "leads", related_entity_id: lead.id, related_dates: [lead.next_followup_date], read: false
          }, `lead_followup:${lead.id}:${lead.next_followup_date}`);
          if (!saved) { skipped++; continue; }
          pushIfEnabled(prefs, m.user_id, title, message, "leads", lead.id);
          created++;
        }
      }

      // Payment Milestone Reminders
      const { data: milestones } = await supabaseAdmin.from("payment_milestones")
        .select("id, name, due_date, due_amount, paid_amount, event_id")
        .eq("workspace_id", currentWsId)
        .neq("status", "paid")
        .not("due_date", "is", null)
        .limit(100);

      for (const ms of milestones || []) {
        if (ms.event_id && settledIds.has(ms.event_id)) continue;
        const msDate = ms.due_date;
        const pending = (Number(ms.due_amount) || 0) - (Number(ms.paid_amount) || 0);
        if (pending <= 0) continue;
        for (const m of recipients) {
          const prefs = memberPrefs[m.user_id];
          // Preferences → Notifications → Categories → "Payments & invoices".
          if (prefs.invoices === false || prefs.in_app === false || prefs.skip_this_run) { skipped++; continue; }
          
          const reminderDays = parseInt(prefs.reminder_days || "3", 10);
          const thresholdDate = addDaysISO(todayISO, reminderDays);

          // Reminder for upcoming or overdue milestones
          if (msDate <= thresholdDate) {
            const key = `${m.user_id}:payment_due:${ms.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            
            const isOverdue = msDate < todayISO;
            const isToday = msDate === todayISO;
            const title = isOverdue ? "Payment Overdue" : (isToday ? "Payment Due Today" : "Payment Coming Up");
            const msg = `Milestone "${ms.name}": ₹${pending} ${isOverdue ? 'overdue since' : 'due on'} ${msDate}.`;

            existingKeys.add(key);
            const saved = await saveReminder({
              workspace_id: currentWsId, user_id: m.user_id, type: "payment_due",
              title,
              message: msg,
              related_entity_type: "milestone", related_entity_id: ms.id, related_dates: [msDate], read: false
            }, `payment_due:${ms.id}`);
            if (!saved) { skipped++; continue; }
            pushIfEnabled(prefs, m.user_id, title, msg, "milestone", ms.id);
            created++;
          }
        }
      }

      if (planCtx.subscription && planCtx.subscription.status === "ACTIVE" && planCtx.expiresAt) {
        const expiry = planCtx.expiresAt;
        if (planCtx.isExpired) {
          for (const m of recipients) {
            const prefs = memberPrefs[m.user_id];
            if (prefs.billing === false || prefs.in_app === false || prefs.skip_this_run) { skipped++; continue; }
            
            const key = `${m.user_id}:subscription_expired:${planCtx.subscription.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            const isLaunch = planCtx.subscription.source === "PROMOTIONAL";
            const title = isLaunch ? "Your free launch month has ended" : "Pro plan expired";
            const message = isLaunch
              ? `Your free launch month ended on ${formatDatesList([expiry])}. Free plan limits now apply. Request renewal in Your Plan to continue with Pro.`
              : `Your Kramasha Pro plan expired on ${formatDatesList([expiry])}. Free plan limits now apply. Renew to restore Pro features.`;
            existingKeys.add(key);
            const saved = await saveReminder({
              workspace_id: currentWsId, user_id: m.user_id, type: "subscription_expired",
              title,
              message,
              related_entity_type: "subscription", related_entity_id: planCtx.subscription.id, read: false
            }, `subscription_expired:${planCtx.subscription.id}`);
            if (!saved) { skipped++; continue; }
            pushIfEnabled(prefs, m.user_id, title, message, "subscription", planCtx.subscription.id);
            created++;
          }
        } else if (expiry <= in7days) {
          for (const m of recipients) {
            const prefs = memberPrefs[m.user_id];
            if (prefs.billing === false || prefs.in_app === false || prefs.skip_this_run) { skipped++; continue; }
            
            const daysLeft = Math.max(1, Math.round((Date.parse(expiry + "T00:00:00Z") - Date.parse(todayISO + "T00:00:00Z")) / 86400000));
            const stage = daysLeft <= 1 ? "1d" : (daysLeft <= 3 ? "3d" : "7d");
            const key = `${m.user_id}:subscription_expiring:${planCtx.subscription.id}:${stage}`;
            if (existingKeys.has(key)) { skipped++; continue; }

            const isLaunch = planCtx.subscription.source === "PROMOTIONAL";
            const title = isLaunch ? "Your free launch month is ending soon" : "Pro plan expiring soon";
            const message = isLaunch
              ? `Your free launch month ends in ${daysLeft} day(s) (${formatDatesList([expiry])}). Request renewal in Your Plan to keep Pro — and we'd love your feedback or a review.`
              : `Your Kramasha Pro plan expires in ${daysLeft} day(s) (${formatDatesList([expiry])}). Renew before expiry to keep Pro features.`;
            existingKeys.add(key);
            const saved = await saveReminder({
              workspace_id: currentWsId, user_id: m.user_id, type: "subscription_expiring",
              title,
              message,
              related_entity_type: "subscription", related_entity_id: planCtx.subscription.id, read: false
            }, `subscription_expiring:${planCtx.subscription.id}:${stage}`);
            if (!saved) { skipped++; continue; }
            pushIfEnabled(prefs, m.user_id, title, message, "subscription", planCtx.subscription.id);
            created++;
          }
        }
      }

      // Every reminder of this workspace is saved: send the pushes, each with the same final unread count.
      for (const send of pushQueue) await send();
    } // End loop over workspacesToScan

    return Response.json({ ok: true, created, skipped, pushed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));