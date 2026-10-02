// Notification service — client-side CRUD for in-app notifications.
// All notifications are created and displayed within the app via Supabase.
import { base44 } from "@/api/base44Client";

// Load notifications for the current user (newest first).
// Accepts an already-known userId to skip a redundant auth.me() round trip
// (the caller almost always already has it from useAuth()); falls back to
// auth.me() only when it isn't passed.
export async function loadNotifications(limit = 50, userId = null, workspaceId = null) {
  const uid = userId || (await base44.auth.me())?.id;
  if (!uid) return [];
  // Only this workspace's notifications — a user in several workspaces must not see one workspace's data in another.
  const notifs = await base44.entities.Notification.filter(
    { user_id: uid, ...(workspaceId ? { workspace_id: workspaceId } : {}) },
    "-created_date",
    limit
  );
  return notifs || [];
}

// Mark a notification as read.
export async function markNotificationRead(id) {
  await base44.entities.Notification.update(id, { read: true });
}

// Mark all notifications as read for the current user.
export async function markAllNotificationsRead(notifications) {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  await base44.entities.Notification.bulkUpdate(
    unread.map((n) => ({ id: n.id, read: true }))
  );
}

// Delete a notification.
export async function deleteNotification(id) {
  await base44.entities.Notification.delete(id);
}

// Create a single in-app notification for the current user.
// Dedup: skips if an unread notification with same type + related_entity_id exists.
// related_dates holds the actual relevant date(s) (e.g. an event's selected
// dates) SEPARATELY from the narrative message, so the UI can render them as
// chips formatted per the workspace's Date Format preference, instead of a
// raw "YYYY-MM-DD" baked into the sentence.
export async function createNotification({ workspace_id, type, title, message, related_entity_type = "", related_entity_id = "", related_dates = [] }) {
  try {
    const user = await base44.auth.me();
    if (!user) return null;

    // Dedup check — skip if unread notification of same type+entity already exists
    if (related_entity_id) {
      const existing = await base44.entities.Notification.filter(
        { user_id: user.id, type, related_entity_id, read: false },
        "-created_date", 1
      );
      if (existing && existing.length > 0) return null;
    }

    return await base44.entities.Notification.create({
      workspace_id,
      user_id: user.id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      related_dates,
      read: false,
    });
  } catch {
    return null;
  }
}

// Notifications are for the workspace owner only — nothing about the workspace goes to other members.
// Only a positively-identified non-owner is excluded; if the lookup fails we do not treat the user as a non-owner
// (that would silently drop their reminders on a network blip).
export async function isWorkspaceOwner(workspaceId, userId) {
  try {
    const [rows, ws] = await Promise.all([
      base44.entities.WorkspaceMember.filter({ workspace_id: workspaceId, user_id: userId }),
      base44.entities.Workspace.get(workspaceId),
    ]);
    if (!ws) return true;
    return ws.owner_user_id === userId || rows?.[0]?.role === "owner";
  } catch {
    return true;
  }
}

// Generate notifications by scanning workspace data for upcoming events,
// overdue milestones, and subscription expiry. Runs client-side.
export async function generateNotifications(workspaceId) {
  try {
    const user = await base44.auth.me();
    if (!user || !workspaceId) return;

    // Respect Preferences → Notifications. If In-App is off entirely, none of
    // these are worth generating — the bell won't show them anyway.
    const prefs = user.notification_preferences || {};
    if (prefs.in_app === false) return;

    // Reminders are only created for the workspace owner.
    if (!(await isWorkspaceOwner(workspaceId, user.id))) return;

    const today = new Date().toISOString().slice(0, 10);
    const todayDT = new Date(today + "T00:00:00");

    // 1. Event reminders — 1 or 2 days before event start
    if (prefs.events !== false) {
      const events = await base44.entities.Event.filter(
        { workspace_id: workspaceId, status: "upcoming" },
        "start_date", 100
      );
      for (const ev of (events || [])) {
        const evDate = ev.start_date || "";
        if (!evDate) continue;
        const daysUntil = Math.ceil((new Date(evDate + "T00:00:00") - todayDT) / (1000 * 60 * 60 * 24));
        if (daysUntil === 1 || daysUntil === 2) {
          const evDates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0 ? ev.event_dates : [evDate];
          await createNotification({
            workspace_id: workspaceId,
            type: "event_reminder",
            title: `${daysUntil === 1 ? "Tomorrow" : "In 2 days"}: ${ev.title || "Event"}`,
            message: `Reminder: ${ev.title || "Event"} is coming up.`,
            related_entity_type: "event",
            related_entity_id: ev.id,
            related_dates: evDates,
          });
        }
      }
    }

    // 2. Payment dues — overdue milestones
    if (prefs.invoices !== false) {
      const milestones = await base44.entities.PaymentMilestone.filter(
        { workspace_id: workspaceId }, "due_date", 200
      );
      for (const m of (milestones || [])) {
        if (m.status === "paid" || m.status === "upcoming") continue;
        const due = Number(m.due_amount) || 0;
        const paid = Number(m.paid_amount) || 0;
        if (due <= 0 || paid >= due) continue;
        const dueDate = m.due_date || "";
        if (dueDate && dueDate < today) {
          await createNotification({
            workspace_id: workspaceId,
            type: "payment_due",
            title: `Payment overdue: ${m.name || "Milestone"}`,
            message: `₹${due - paid} pending.`,
            related_entity_type: "milestone",
            related_entity_id: m.id,
            related_dates: [dueDate],
          });
        }
      }
    }

    // 3. Subscription expiry — within 7 days
    const subs = await base44.entities.WorkspaceSubscription.filter(
      { workspace_id: workspaceId, status: "ACTIVE" }, "expires_at", 10
    );
    for (const s of (subs || [])) {
      const expDate = s.expires_at || "";
      if (!expDate) continue;
      const daysToExpire = Math.ceil((new Date(expDate + "T00:00:00") - todayDT) / (1000 * 60 * 60 * 24));
      if (daysToExpire >= 0 && daysToExpire <= 7) {
        await createNotification({
          workspace_id: workspaceId,
          type: daysToExpire === 0 ? "subscription_expired" : "subscription_expiring",
          title: daysToExpire === 0 ? "Subscription expired today" : `Subscription expires in ${daysToExpire} days`,
          message: "Renew your plan to keep using premium features.",
          related_entity_type: "subscription",
          related_entity_id: s.id,
          related_dates: [expDate],
        });
      }
    }
  } catch {
    // Silent fail — notification generation is best-effort.
  }
}

const sameDates = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);

// Bring existing event/payment notifications in line with the current data: drop reminders for
// events that were deleted, cancelled, completed or moved out of the reminder window, and refresh
// the title/dates of ones that still apply (e.g. the event was renamed or rescheduled). Then
// generate any newly due ones. Called when events/milestones change so the bell stays accurate.
export async function syncNotifications(workspaceId) {
  try {
    const user = await base44.auth.me();
    if (!user || !workspaceId) return;
    if ((user.notification_preferences || {}).in_app === false) return;

    const todayDT = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    const existing = (await loadNotifications(100, user.id, workspaceId)).filter(
      (n) => n.workspace_id === workspaceId && (n.type === "event_reminder" || n.type === "payment_due")
    );

    // Reminders are for the owner only: clear any this user got earlier and stop.
    if (!(await isWorkspaceOwner(workspaceId, user.id))) {
      for (const n of existing) await deleteNotification(n.id);
      return;
    }

    if (existing.length > 0) {
      const [events, milestones] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "start_date", 500),
        base44.entities.PaymentMilestone.filter({ workspace_id: workspaceId }, "due_date", 500),
      ]);
      const eventById = new Map((events || []).map((e) => [e.id, e]));
      const milestoneById = new Map((milestones || []).map((m) => [m.id, m]));

      for (const n of existing) {
        if (n.type === "event_reminder") {
          const ev = eventById.get(n.related_entity_id);
          const daysUntil = ev?.start_date
            ? Math.ceil((new Date(ev.start_date + "T00:00:00") - todayDT) / 86400000)
            : null;
          if (!ev || ev.status !== "upcoming") {
            await deleteNotification(n.id);
            continue;
          }
          const dates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0 ? ev.event_dates : [ev.start_date];
          const moved = !sameDates([...(n.related_dates || [])].sort(), [...dates].sort());
          const inWindow = daysUntil === 1 || daysUntil === 2;
          if (!moved && !inWindow) {
            await deleteNotification(n.id); // reminder window passed, nothing changed
            continue;
          }
          // Rescheduled events stay in the bell (marked unread) with the new dates, even when the
          // new date is outside the 1–2 day reminder window.
          const name = ev.title || "Event";
          const title = inWindow
            ? `${moved ? "Rescheduled · " : ""}${daysUntil === 1 ? "Tomorrow" : "In 2 days"}: ${name}`
            : `Rescheduled: ${name}`;
          const message = moved ? `${name} has been moved to new date(s).` : `Reminder: ${name} is coming up.`;
          if (moved || n.title !== title) {
            await base44.entities.Notification.update(n.id, {
              title, message, related_dates: dates, ...(moved ? { read: false } : {}),
            });
          }
        } else {
          const m = milestoneById.get(n.related_entity_id);
          const due = Number(m?.due_amount) || 0;
          const paid = Number(m?.paid_amount) || 0;
          if (!m || m.status === "paid" || due <= 0 || paid >= due) {
            await deleteNotification(n.id);
          }
        }
      }
    }

    await generateNotifications(workspaceId);
  } catch {
    // Best-effort, same as generateNotifications.
  }
}
