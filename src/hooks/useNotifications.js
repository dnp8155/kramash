// useNotifications hook — manages notification state for the current user.
// Uses React Query so notifications are cached across page navigations
// (no reload on every mount). generateNotifications is called once at the
// AppLayout level, NOT here — calling it on every mount caused 429 storms.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "@/lib/notificationService";
import { useWorkspace } from "@/lib/WorkspaceContext";

export function useNotifications() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ["notifications", workspaceId],
    queryFn: () => loadNotifications(50),
    enabled: !!workspaceId,
    staleTime: 60 * 1000, // cache for 60s — no refetch on every page mount
    gcTime: 5 * 60 * 1000,
  });

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