// Notification service — client-side CRUD for in-app notifications.
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

// Trigger server-side notification generation (scans for upcoming events,
// subscription expiry, etc.).
export async function generateNotifications(workspaceId) {
  try {
    await base44.functions.invoke("generateNotifications", {
      workspace_id: workspaceId
    });
  } catch (e) {
    // Silent fail — notification generation is best-effort.
  }
}