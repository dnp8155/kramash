// useNotifications hook — manages notification state for the current user.
// Uses React Query for caching + Supabase Realtime for live updates.
// generateNotifications is called once at the AppLayout level, NOT here.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "@/lib/notificationService";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { supabase } from "@/lib/supabaseClient";

export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ["notifications", workspaceId],
    queryFn: () => loadNotifications(50),
    enabled: !!workspaceId,
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

  return {
    notifications,
    unreadCount,
    loading,
    open: false,
    setOpen: () => {},
    reload: () => queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] }),
    markRead,
    markAllRead
  };
}