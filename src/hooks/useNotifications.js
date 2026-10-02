// useNotifications hook — manages notification state for the current user.
// Uses React Query for caching + Supabase Realtime for live updates.
// generateNotifications is called once at the AppLayout level, NOT here.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from "@/lib/notificationService";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // In-App Notifications toggle (Preferences → Notifications) — off means
  // don't show anything in the bell at all, not just stop generating new ones.
  const inAppEnabled = user?.notification_preferences?.in_app !== false;

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ["notifications", workspaceId],
    // user is already resolved by AuthContext at this point — pass its id
    // through so loadNotifications skips its own auth.me() round trip.
    queryFn: () => loadNotifications(50, user?.id, workspaceId),
    enabled: !!workspaceId && inAppEnabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Realtime: refresh when notifications table changes (new/read/deleted)
  useEffect(() => {
    if (!workspaceId) return;
    let channel;
    try {
      channel = supabase
        .channel(`notifications_rt_${workspaceId}_${Date.now()}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `workspace_id=eq.${workspaceId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
          }
        )
        .subscribe();
    } catch {
      // realtime is best-effort — polling fallback still works via staleTime
    }
    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch { /* */ }
    };
  }, [workspaceId, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id) => {
    await markNotificationRead(id);
    queryClient.setQueryData(["notifications", workspaceId], (old) =>
      (old || []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = async () => {
    await markAllNotificationsRead(notifications);
    queryClient.setQueryData(["notifications", workspaceId], (old) =>
      (old || []).map((n) => ({ ...n, read: true }))
    );
  };

  const clearNotification = async (id) => {
    const prev = notifications;
    queryClient.setQueryData(["notifications", workspaceId], (old) =>
      (old || []).filter((n) => n.id !== id)
    );
    try {
      await deleteNotification(id);
    } catch {
      // Revert on failure
      queryClient.setQueryData(["notifications", workspaceId], prev);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    open: false,
    setOpen: () => {},
    reload: () => queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] }),
    markRead,
    markAllRead,
    clearNotification
  };
}