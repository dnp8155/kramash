import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useFeatureGate } from "@/components/common/ProGate";
import { gmailStatus } from "@/lib/gmailService";

// Is this workspace's Gmail connected? Only asked on plans that include it (Pro), since Free can't connect.
export function useGmailAccount() {
  const { workspaceId } = useWorkspace();
  const { hasFeature } = useFeatureGate();
  const allowed = hasFeature("client_email_enabled");
  const q = useQuery({
    queryKey: ["gmail_account", workspaceId],
    queryFn: () => gmailStatus(workspaceId),
    enabled: !!workspaceId && allowed,
    staleTime: 60_000,
    retry: false,
  });
  return {
    loading: allowed && q.isLoading,
    connected: !!q.data?.connected,
    needsReconnect: !!q.data?.needs_reconnect,
    email: q.data?.email || null,
    configured: q.data?.configured !== false,
    refetch: q.refetch,
  };
}
