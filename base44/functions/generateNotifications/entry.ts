// generateNotifications backend function.
// Scans workspace data and generates in-app notifications for:
// - Upcoming events (within 24-48 hours)
// - Subscription expiring (within 7 days)
// - Subscription expired
//
// Runs on-demand (called from the client on app load) or can be triggered
// by a scheduled workflow. Uses asServiceRole to create notifications for
// all workspace members.

import { resolvePlanContext } from "../../shared/planEngine.ts";

export default async function (req) {
  try {
    const { createClientFromRequest } = await import("npm:@base44/sdk@0.8.40");
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body?.workspace_id || user.data?.active_workspace_id;

    if (!workspaceId) {
      return Response.json({ error: "No active workspace" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get workspace members to create notifications for.
    const members = await base44.asServiceRole.entities.WorkspaceMember.filter({
      workspace_id: workspaceId,
      status: "active"
    });
    if (!members || members.length === 0) return Response.json({ ok: true, created: 0, skipped: 0 });

    // Verify the caller is an active member of this workspace.
    const isMember = members.some((m) => m.user_id === user.id);
    if (!isMember) {
      return Response.json({ error: "Access denied: not a member of this workspace" }, { status: 403 });
    }

    // Resolve category-aware terminology for notification messages.
    const workspace = await base44.asServiceRole.entities.Workspace.get(workspaceId).catch(() => null);
    const category = workspace?.business_category || "OTHER";
    const isProjectCategory = category === "ARCHITECTURE" || category === "OTHER";
    const workSingular = workspace?.custom_work_label_singular?.trim() || (isProjectCategory ? "Project" : "Event");
    const workPlural = workspace?.custom_work_label_plural?.trim() || (isProjectCategory ? "Projects" : "Events");
    const reminderTomorrow = isProjectCategory ? `${workSingular} starts tomorrow` : `${workSingular} tomorrow`;
    const reminderComing = isProjectCategory ? `${workSingular} coming up` : `${workSingular} coming up`;
    const reminderVerb = isProjectCategory ? "starts on" : "is scheduled for";

    // Get existing unread notifications to avoid duplicates.
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      workspace_id: workspaceId
    }, "-created_date", 100);
    const existingKeys = new Set(
      (existingNotifs || []).map((n) => `${n.user_id}:${n.type}:${n.related_entity_id}`)
    );

    // 1. Upcoming events within 48 hours.
    const events = await base44.asServiceRole.entities.Event.filter({
      workspace_id: workspaceId,
      status: "upcoming"
    }, "start_date", 200);

    // Resolve user emails for email notifications.
    const memberUsers = await Promise.all(
      members.map((m) => base44.asServiceRole.entities.User.get(m.user_id).catch(() => null))
    );
    const memberEmails = {};
    memberUsers.forEach((u, i) => {
      if (u?.email) memberEmails[members[i].user_id] = u.email;
    });

    for (const ev of events || []) {
      if (!ev.start_date) continue;
      if (ev.start_date >= todayISO && ev.start_date <= in48h) {
        for (const m of members) {
          const key = `${m.user_id}:event_reminder:${ev.id}`;
          if (existingKeys.has(key)) { skipped++; continue; }
          const is24 = ev.start_date <= in24h;
          await base44.asServiceRole.entities.Notification.create({
            workspace_id: workspaceId,
            user_id: m.user_id,
            type: "event_reminder",
            title: is24 ? reminderTomorrow : reminderComing,
            message: `"${ev.title}" ${reminderVerb} ${ev.start_date}${ev.venue ? ` at ${ev.venue}` : ""}.`,
            related_entity_type: "event",
            related_entity_id: ev.id,
            read: false
          });
          existingKeys.add(key);
          created++;

          // Send email notification if the member has an email.
          const email = memberEmails[m.user_id];
          if (email) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `${is24 ? reminderTomorrow : reminderComing}: ${ev.title}`,
                body: `Hi ${m.user_name || ""},\n\nThis is a reminder that "${ev.title}" ${reminderVerb} ${ev.start_date}${ev.venue ? ` at ${ev.venue}` : ""}.\n\n— ${workspace?.name || "Kramasha"}`
              });
            } catch (e) {
              // Email send is best-effort; don't fail the whole function.
            }
          }
        }
      }
    }

    // 2. Subscription expiring / expired.
    const planCtx = await resolvePlanContext(base44, workspaceId);
    if (planCtx.subscription && planCtx.subscription.status === "ACTIVE" && planCtx.expiresAt) {
      const expiry = planCtx.expiresAt;
      const isExpired = planCtx.isExpired;

      if (isExpired) {
        for (const m of members) {
          const key = `${m.user_id}:subscription_expired:${planCtx.subscription.id}`;
          if (existingKeys.has(key)) { skipped++; continue; }
          {
            await base44.asServiceRole.entities.Notification.create({
              workspace_id: workspaceId,
              user_id: m.user_id,
              type: "subscription_expired",
              title: "Pro plan expired",
              message: `Your Kramasha Pro plan expired on ${expiry}. Free plan limits now apply. Renew to restore Pro features.`,
              related_entity_type: "subscription",
              related_entity_id: planCtx.subscription.id,
              read: false
            });
            existingKeys.add(key);
            created++;
          }
        }
      } else if (expiry <= in7days) {
        for (const m of members) {
          const key = `${m.user_id}:subscription_expiring:${planCtx.subscription.id}`;
          if (existingKeys.has(key)) { skipped++; continue; }
          {
            const daysLeft = Math.ceil((new Date(expiry + "T00:00:00").getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            await base44.asServiceRole.entities.Notification.create({
              workspace_id: workspaceId,
              user_id: m.user_id,
              type: "subscription_expiring",
              title: "Pro plan expiring soon",
              message: `Your Kramasha Pro plan expires in ${daysLeft} day(s) (${expiry}). Renew before expiry to keep Pro features.`,
              related_entity_type: "subscription",
              related_entity_id: planCtx.subscription.id,
              read: false
            });
            existingKeys.add(key);
            created++;
          }
        }
      }
    }

    return Response.json({ ok: true, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}