// generateNotifications — Scan workspace data + generate in-app + email notifications.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { resolvePlanContext } from "../_shared/planEngine.ts";
import { formatDatesList } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body?.workspace_id;
    if (!workspaceId) return Response.json({ error: "No active workspace" }, { status: 400 });

    let created = 0, skipped = 0;
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: members } = await supabaseAdmin.from("workspace_members").select("*").eq("workspace_id", workspaceId).eq("status", "active");
    if (!members || members.length === 0) return Response.json({ ok: true, created: 0, skipped: 0 });

    const isMember = (members || []).some((m) => m.user_id === user.id);
    if (!isMember) return Response.json({ error: "Access denied: not a member of this workspace" }, { status: 403 });

    const { data: workspace } = await supabaseAdmin.from("workspaces").select("*").eq("id", workspaceId).single();
    const category = workspace?.business_category || "OTHER";
    const isProjectCategory = category === "ARCHITECTURE" || category === "OTHER";
    const workSingular = workspace?.custom_work_label_singular?.trim() || (isProjectCategory ? "Project" : "Event");
    const reminderTomorrow = isProjectCategory ? `${workSingular} starts tomorrow` : `${workSingular} tomorrow`;
    const reminderComing = isProjectCategory ? `${workSingular} coming up` : `${workSingular} coming up`;
    const reminderVerb = isProjectCategory ? "starts on" : "is scheduled for";

    const { data: existingNotifs } = await supabaseAdmin.from("notifications").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100);
    const existingKeys = new Set((existingNotifs || []).map((n) => `${n.user_id}:${n.type}:${n.related_entity_id}`));

    const { data: events } = await supabaseAdmin.from("events").select("*").eq("workspace_id", workspaceId).eq("status", "upcoming").order("start_date", { ascending: true }).limit(200);

    const memberEmails: Record<string, string> = {};
    const memberNames: Record<string, string> = {};
    for (const m of members || []) {
      const { data: u } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", m.user_id).single();
      if (u?.email) memberEmails[m.user_id] = u.email;
      if (u?.full_name) memberNames[m.user_id] = u.full_name;
    }

    for (const ev of events || []) {
      const evDates = (ev.event_dates && ev.event_dates.length > 0) ? ev.event_dates : (ev.start_date ? [ev.start_date] : []);
      if (evDates.length === 0) continue;
      const firstDate = evDates.slice().sort()[0];
      if (firstDate >= todayISO && firstDate <= in48h) {
        for (const m of members || []) {
          const key = `${m.user_id}:event_reminder:${ev.id}`;
          if (existingKeys.has(key)) { skipped++; continue; }
          const is24 = firstDate <= in24h;
          await supabaseAdmin.from("notifications").insert({
            workspace_id: workspaceId, user_id: m.user_id, type: "event_reminder",
            title: is24 ? reminderTomorrow : reminderComing,
            message: `"${ev.title}" ${reminderVerb} ${formatDatesList(evDates)}${ev.venue ? ` at ${ev.venue}` : ""}.`,
            related_entity_type: "event", related_entity_id: ev.id, read: false
          });
          existingKeys.add(key);
          created++;
        }
      }
    }

    const planCtx = await resolvePlanContext(workspaceId);
    if (planCtx.subscription && planCtx.subscription.status === "ACTIVE" && planCtx.expiresAt) {
      const expiry = planCtx.expiresAt;
      if (planCtx.isExpired) {
        for (const m of members || []) {
          const key = `${m.user_id}:subscription_expired:${planCtx.subscription.id}`;
          if (existingKeys.has(key)) { skipped++; continue; }
          await supabaseAdmin.from("notifications").insert({
            workspace_id: workspaceId, user_id: m.user_id, type: "subscription_expired",
            title: "Pro plan expired",
            message: `Your Kramasha Pro plan expired on ${formatDatesList([expiry])}. Free plan limits now apply. Renew to restore Pro features.`,
            related_entity_type: "subscription", related_entity_id: planCtx.subscription.id, read: false
          });
          existingKeys.add(key);
          created++;
        }
      } else if (expiry <= in7days) {
        for (const m of members || []) {
          const key = `${m.user_id}:subscription_expiring:${planCtx.subscription.id}`;
          if (existingKeys.has(key)) { skipped++; continue; }
          const daysLeft = Math.ceil((new Date(expiry + "T00:00:00").getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          await supabaseAdmin.from("notifications").insert({
            workspace_id: workspaceId, user_id: m.user_id, type: "subscription_expiring",
            title: "Pro plan expiring soon",
            message: `Your Kramasha Pro plan expires in ${daysLeft} day(s) (${formatDatesList([expiry])}). Renew before expiry to keep Pro features.`,
            related_entity_type: "subscription", related_entity_id: planCtx.subscription.id, read: false
          });
          existingKeys.add(key);
          created++;
        }
      }
    }

    return Response.json({ ok: true, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});