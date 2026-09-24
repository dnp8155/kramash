// Notification service — client-side CRUD for in-app notifications.
// All notifications are created and displayed within the app via Supabase.
import { base44 } from "@/api/base44Client";

// Load notifications for the current user (newest first).
export async function loadNotifications(limit = 50) {
  const user = await base44.auth.me();
  if (!user) return [];
  const notifs = await base44.entities.Notification.filter(
    { user_id: user.id },
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
export async function createNotification({ workspace_id, type, title, message, related_entity_type = "", related_entity_id = "" }) {
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
      read: false,
    });
  } catch {
    return null;
  }
}

// Generate notifications by scanning workspace data for upcoming events,
// overdue milestones, and subscription expiry. Runs client-side.
export async function generateNotifications(workspaceId) {
  try {
    const user = await base44.auth.me();
    if (!user || !workspaceId) return;

    const today = new Date().toISOString().slice(0, 10);
    const todayDT = new Date(today + "T00:00:00");

    // 1. Event reminders — 1 or 2 days before event start
    const events = await base44.entities.Event.filter(
      { workspace_id: workspaceId, status: "upcoming" },
      "start_date", 100
    );
    for (const ev of (events || [])) {
      const evDate = ev.start_date || "";
      if (!evDate) continue;
      const daysUntil = Math.ceil((new Date(evDate + "T00:00:00") - todayDT) / (1000 * 60 * 60 * 24));
      if (daysUntil === 1 || daysUntil === 2) {
        await createNotification({
          workspace_id: workspaceId,
          type: "event_reminder",
          title: `${daysUntil === 1 ? "Tomorrow" : "In 2 days"}: ${ev.title || "Event"}`,
          message: `Reminder: ${ev.title || "Event"} on ${evDate}`,
          related_entity_type: "event",
          related_entity_id: ev.id,
        });
      }
    }

    // 2. Payment dues — overdue milestones
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
          message: `₹${due - paid} pending since ${dueDate}`,
          related_entity_type: "milestone",
          related_entity_id: m.id,
        });
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
        });
      }
    }
  } catch {
    // Silent fail — notification generation is best-effort.
  }
}