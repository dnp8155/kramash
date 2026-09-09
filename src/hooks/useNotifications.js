import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/lib/PlanContext";

// Notification hook: fetches workspace notifications, tracks unread count,
// and provides mark-as-read. Also generates subscription expiry reminders
// on load if they don't already exist.
export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const { subscription, isPro, expiresAt } = usePlan();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const notifs = await base44.entities.Notification.filter(
        { workspace_id: workspaceId },
        "-created_date",
        50
      );
      setNotifications(notifs || []);
    } catch (e) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  // Generate subscription expiry reminders (7 days before, and expired).
  useEffect(() => {
    if (!workspaceId || !subscription) return;

    const now = new Date().toISOString().slice(0, 10);
    const generate = async () => {
      try {
        // Check for "expiring in 7 days" notification.
        if (expiresAt && subscription.status === "ACTIVE") {
          const expiryDate = new Date(expiresAt + "T00:00:00");
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            // Check if we already created this notification recently.
            const existing = await base44.entities.Notification.filter(
              {
                workspace_id: workspaceId,
                type: "SUBSCRIPTION_EXPIRING",
                related_entity_id: subscription.id,
              },
              "-created_date",
              1
            );
            if (!existing || existing.length === 0) {
              await base44.entities.Notification.create({
                workspace_id: workspaceId,
                type: "SUBSCRIPTION_EXPIRING",
                title: "Subscription expiring soon",
                message: `Your Kramashah Pro plan expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}. Renew to keep your Pro features.`,
                related_entity_type: "WorkspaceSubscription",
                related_entity_id: subscription.id,
                read: false,
              });
              load();
            }
          }
        }

        // Check for "expired" notification.
        if (subscription.status === "EXPIRED" || (expiresAt && expiresAt < now)) {
          const existing = await base44.entities.Notification.filter(
            {
              workspace_id: workspaceId,
              type: "SUBSCRIPTION_EXPIRED",
              related_entity_id: subscription.id,
            },
            "-created_date",
            1
          );
          if (!existing || existing.length === 0) {
            await base44.entities.Notification.create({
              workspace_id: workspaceId,
              type: "SUBSCRIPTION_EXPIRED",
              title: "Subscription expired",
              message: "Your Kramashah Pro plan has expired. Renew to restore Pro features.",
              related_entity_type: "WorkspaceSubscription",
              related_entity_id: subscription.id,
              read: false,
            });
            load();
          }
        }
      } catch {
        // Non-critical — don't block the UI.
      }
    };
    generate();
  }, [workspaceId, subscription, expiresAt, load]);

  const markAsRead = useCallback(async (id) => {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    await base44.entities.Notification.bulkUpdate(
      unread.map((n) => ({ id: n.id, read: true }))
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: load,
  };
}