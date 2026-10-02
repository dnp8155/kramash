import { withCors } from "../_shared/cors.ts";
// generateNotifications — Scan workspace data + generate in-app notifications.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { resolvePlanContext } from "../_shared/planEngine.ts";
import { formatDatesList } from "../_shared/helpers.ts";

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body?.workspace_id;

    // If a specific workspace is requested (e.g. from app open)
    let workspacesToScan = [];
    if (workspaceId) {
      workspacesToScan = [workspaceId];
    } else {
      // If no workspace is requested, assume it's a cron job and scan all active ones
      const { data: allWs } = await supabaseAdmin.from("workspaces").select("id");
      workspacesToScan = (allWs || []).map(w => w.id);
    }

    let created = 0, skipped = 0;
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    for (const currentWsId of workspacesToScan) {

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

      const { data: existingNotifs } = await supabaseAdmin.from("notifications").select("*").eq("workspace_id", currentWsId).order("created_at", { ascending: false }).limit(100);
      const existingKeys = new Set((existingNotifs || []).map((n) => `${n.user_id}:${n.type}:${n.related_entity_id}`));

      const { data: events } = await supabaseAdmin.from("events").select("*").eq("workspace_id", currentWsId).eq("status", "upcoming").order("start_date", { ascending: true }).limit(200);

      const memberNames: Record<string, string> = {};
      const memberPrefs: Record<string, any> = {};
      
      // Get current time in IST (Asia/Kolkata)
      const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const currentHour = istTime.getHours();

      for (const m of recipients) {
        const { data: u } = await supabaseAdmin.from("profiles").select("full_name, notification_preferences").eq("id", m.user_id).single();
        if (u?.full_name) memberNames[m.user_id] = u.full_name;
        
        const prefs = u?.notification_preferences || { in_app: true, push: true, events: true, quotations: true, invoices: true, reminder_days: "3", reminder_time: "09:00" };
        
        // Dynamic time check: e.g. "09:00" -> hour 9
        const prefTime = prefs.reminder_time || "09:00";
        const prefHour = parseInt(prefTime.split(":")[0], 10);
        
        // If it's a cron job (workspacesToScan length > 1 usually, or just assume automatic),
        // we only send notifications if the current hour matches the user's preferred hour.
        if (workspacesToScan.length > 1 && currentHour !== prefHour) {
          prefs.skip_this_run = true;
        }

        memberPrefs[m.user_id] = prefs;
      }

      for (const ev of events || []) {
        const evDates = (ev.event_dates && ev.event_dates.length > 0) ? ev.event_dates : (ev.start_date ? [ev.start_date] : []);
        if (evDates.length === 0) continue;
        const firstDate = evDates.slice().sort()[0];
        
        for (const m of recipients) {
          const prefs = memberPrefs[m.user_id];
          if (!prefs.events || !prefs.in_app || prefs.skip_this_run) { skipped++; continue; }
          
          const reminderDays = parseInt(prefs.reminder_days || "3", 10);
          const thresholdDate = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          
          // If event is coming up within the user's preferred reminder window (and is in the future)
          if (firstDate >= todayISO && firstDate <= thresholdDate) {
            const key = `${m.user_id}:event_reminder:${ev.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            
            const isTomorrow = firstDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            await supabaseAdmin.from("notifications").insert({
              workspace_id: currentWsId, user_id: m.user_id, type: "event_reminder",
              title: isTomorrow ? reminderTomorrow : reminderComing,
              message: `"${ev.title}" ${reminderVerb} ${formatDatesList(evDates)}${ev.venue ? ` at ${ev.venue}` : ""}.`,
              related_entity_type: "event", related_entity_id: ev.id, read: false
            });
            existingKeys.add(key);
            created++;
          }
        }
      }

      // Payment Milestone Reminders
      const { data: milestones } = await supabaseAdmin.from("payment_milestones")
        .select("id, name, due_date, due_amount, event_id")
        .eq("workspace_id", currentWsId)
        .in("status", ["upcoming", "overdue"])
        .not("due_date", "is", null)
        .limit(100);

      for (const ms of milestones || []) {
        const msDate = ms.due_date;
        for (const m of recipients) {
          const prefs = memberPrefs[m.user_id];
          // We use the same 'events' preference (or 'invoices' if you prefer, but 'events' is tied to the main reminder switch in UI)
          if (!prefs.events || !prefs.in_app || prefs.skip_this_run) { skipped++; continue; }
          
          const reminderDays = parseInt(prefs.reminder_days || "3", 10);
          const thresholdDate = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          // Reminder for upcoming or overdue milestones
          if (msDate <= thresholdDate) {
            const key = `${m.user_id}:payment_reminder:${ms.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            
            const isOverdue = msDate < todayISO;
            const isToday = msDate === todayISO;
            const title = isOverdue ? "Payment Overdue" : (isToday ? "Payment Due Today" : "Payment Coming Up");
            const msg = `Milestone "${ms.name}" for ₹${ms.due_amount} is ${isOverdue ? 'overdue' : 'due on'} ${msDate}.`;
            
            await supabaseAdmin.from("notifications").insert({
              workspace_id: currentWsId, user_id: m.user_id, type: "invoice_update",
              title,
              message: msg,
              related_entity_type: "milestone", related_entity_id: ms.id, read: false
            });
            existingKeys.add(key);
            created++;
          }
        }
      }

      const planCtx = await resolvePlanContext(currentWsId);
      if (planCtx.subscription && planCtx.subscription.status === "ACTIVE" && planCtx.expiresAt) {
        const expiry = planCtx.expiresAt;
        if (planCtx.isExpired) {
          for (const m of recipients) {
            const prefs = memberPrefs[m.user_id];
            if (prefs.skip_this_run) { skipped++; continue; }
            
            const key = `${m.user_id}:subscription_expired:${planCtx.subscription.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            await supabaseAdmin.from("notifications").insert({
              workspace_id: currentWsId, user_id: m.user_id, type: "subscription_expired",
              title: "Pro plan expired",
              message: `Your Kramasha Pro plan expired on ${formatDatesList([expiry])}. Free plan limits now apply. Renew to restore Pro features.`,
              related_entity_type: "subscription", related_entity_id: planCtx.subscription.id, read: false
            });
            existingKeys.add(key);
            created++;
          }
        } else if (expiry <= in7days) {
          for (const m of recipients) {
            const prefs = memberPrefs[m.user_id];
            if (prefs.skip_this_run) { skipped++; continue; }
            
            const key = `${m.user_id}:subscription_expiring:${planCtx.subscription.id}`;
            if (existingKeys.has(key)) { skipped++; continue; }
            const daysLeft = Math.ceil((new Date(expiry + "T00:00:00").getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            await supabaseAdmin.from("notifications").insert({
              workspace_id: currentWsId, user_id: m.user_id, type: "subscription_expiring",
              title: "Pro plan expiring soon",
              message: `Your Kramasha Pro plan expires in ${daysLeft} day(s) (${formatDatesList([expiry])}). Renew before expiry to keep Pro features.`,
              related_entity_type: "subscription", related_entity_id: planCtx.subscription.id, read: false
            });
            existingKeys.add(key);
            created++;
          }
        }
      }
    } // End loop over workspacesToScan

    return Response.json({ ok: true, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));