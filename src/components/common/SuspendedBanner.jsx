import { Ban } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";

// Shown across the app while an admin has suspended this workspace (new events, clients' leads, team and services are blocked).
export default function SuspendedBanner() {
  const t = useT();
  const { workspace } = useWorkspace();
  if (workspace?.plan_status !== "suspended") return null;
  return (
    <div role="alert" className="shrink-0 bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-center gap-2">
      <Ban className="w-4 h-4 shrink-0" />
      {t("This workspace is suspended. Please contact support.")}
    </div>
  );
}
