// useNotifications hook — manages notification state for the current user.
// Uses React Query for caching + Supabase Realtime for live updates.
// The reminder scan runs once at the AppLayout level (and when the bell opens), NOT here.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification
} from "@/lib/notificationService";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { setAppBadgeCount, clearAppBadge } from "@/lib/appBadge";

export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // In-App Notifications toggle (Preferences → Notifications) — off means
  // don't show anything in the bell at all, not just stop generating new ones.
  const inAppEnabled = user?.notification_preferences?.in_app !== false;
  const listKey = ["notifications", workspaceId];
  // Starts with the list's key, so every refresh of the list (realtime, after a scan) refreshes the count too.
  const countKey = ["notifications", workspaceId, "unread"];

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: listKey,
    // user is already resolved by AuthContext at this point — pass its id
    // through so loadNotifications skips its own auth.me() round trip.
    queryFn: () => loadNotifications(50, user?.id, workspaceId),
    enabled: !!workspaceId && inAppEnabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Every unread one on the server, not just the 50 loaded: the same number the server puts on the app icon with a push.
  const { data: serverUnread, isSuccess: countLoaded } = useQuery({
    queryKey: countKey,
    queryFn: () => countUnreadNotifications(user?.id, workspaceId),
    enabled: !!workspaceId && !!user?.id && inAppEnabled,
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
          (payload) => {
            queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
            // A new / edited client review arrives with its bell entry (pointing at the client): refresh the open review lists.
            if (payload?.eventType === "INSERT" && payload.new?.related_entity_type === "clients") {
              queryClient.invalidateQueries({ queryKey: ["clientReviews", workspaceId] });
            }
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

  const loadedUnread = notifications.filter((n) => !n.read).length;
  // The server count when it has arrived (never below what is visibly unread in the list).
  const unreadCount = countLoaded ? Math.max(serverUnread || 0, loadedUnread) : loadedUnread;

  // Keep the app icon's badge equal to the unread count: it rises with new notifications and is cleared
  // when they're read or cleared, when in-app notifications are switched off, and on sign-out.
  useEffect(() => {
    if (loading && notifications.length === 0) return; // don't flash 0 while the first load is running
    setAppBadgeCount(inAppEnabled ? unreadCount : 0);
  }, [unreadCount, inAppEnabled, loading, notifications.length]);
  useEffect(() => () => clearAppBadge(), []);

  // One fewer unread on screen at once (the count query catches up on its next refresh).
  const dropOneUnread = () => queryClient.setQueryData(countKey, (c) => (typeof c === "number" ? Math.max(0, c - 1) : c));

  const markRead = async (id) => {
    const wasUnread = notifications.some((n) => n.id === id && !n.read);
    await markNotificationRead(id);
    queryClient.setQueryData(listKey, (old) =>
      (old || []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (wasUnread) dropOneUnread();
  };

  const markAllRead = async () => {
    const prevList = queryClient.getQueryData(listKey);
    const prevCount = queryClient.getQueryData(countKey);
    queryClient.setQueryData(listKey, (old) => (old || []).map((n) => ({ ...n, read: true })));
    queryClient.setQueryData(countKey, 0);
    try {
      await markAllNotificationsRead(user?.id, workspaceId);
    } catch {
      queryClient.setQueryData(listKey, prevList);
      queryClient.setQueryData(countKey, prevCount);
    }
  };

  const clearNotification = async (id) => {
    const prevList = queryClient.getQueryData(listKey);
    const prevCount = queryClient.getQueryData(countKey);
    const wasUnread = notifications.some((n) => n.id === id && !n.read);
    queryClient.setQueryData(listKey, (old) => (old || []).filter((n) => n.id !== id));
    if (wasUnread) dropOneUnread();
    try {
      await dismissNotification(id);
    } catch {
      // Revert on failure
      queryClient.setQueryData(listKey, prevList);
      queryClient.setQueryData(countKey, prevCount);
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
