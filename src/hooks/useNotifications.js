// useNotifications hook — manages notification state for the current user.
import { useState, useEffect, useCallback } from "react";
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  generateNotifications
} from "@/lib/notificationService";
import { useWorkspace } from "@/lib/WorkspaceContext";

export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const notifs = await loadNotifications(50);
      setNotifications(notifs);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate + load on mount and when workspace changes.
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      await generateNotifications(workspaceId);
      if (!cancelled) await load();
    })();
    return () => { cancelled = true; };
  }, [workspaceId, load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead(notifications);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    open,
    setOpen,
    reload: load,
    markRead,
    markAllRead
  };
}