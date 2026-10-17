// Drives and event storage locations for the workspace (shared by Preferences, the event tab and the Storage page).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { loadDrives, loadLocations } from "@/lib/storageService";

export function useStorageData() {
  const { workspaceId } = useWorkspace();
  const drivesQ = useQuery({ queryKey: ["storage-drives", workspaceId], queryFn: () => loadDrives(workspaceId), enabled: !!workspaceId, staleTime: 30000 });
  const locsQ = useQuery({ queryKey: ["storage-locations", workspaceId], queryFn: () => loadLocations(workspaceId), enabled: !!workspaceId, staleTime: 30000 });
  const drives = drivesQ.data || [];
  const locations = locsQ.data || [];
  const drivesById = useMemo(() => Object.fromEntries(drives.map((d) => [d.id, d])), [drives]);
  return { drives, locations, drivesById, loading: drivesQ.isLoading || locsQ.isLoading, error: drivesQ.error || locsQ.error };
}
