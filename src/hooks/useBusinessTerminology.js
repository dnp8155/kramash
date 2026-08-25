// Phase 10 — React hook for the central terminology system.
// Reads the active workspace from WorkspaceContext and returns its terminology.
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getBusinessTerminology } from "@/lib/businessTerminology";

export function useBusinessTerminology() {
  const { workspace } = useWorkspace();
  return getBusinessTerminology(workspace);
}