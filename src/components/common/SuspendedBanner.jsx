import { Ban } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";

// Shown across the app while an admin has suspended this workspace. The workspace is read-only: everything can be viewed
// and exported, but nothing can be added, edited or deleted (see lib/suspension.js). Same look as the "Update now" banner,
// in the warning colour, with Help & Support one tap away.
export default function SuspendedBanner() {
  const t = useT();
  const { workspace } = useWorkspace();
  if (workspace?.plan_status !== "suspended") return null;
  return (
    <div role="alert" className="bg-destructive text-destructive-foreground px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] text-sm flex items-center justify-between gap-3 sticky top-0 z-30">
      <span className="flex items-center gap-2 min-w-0">
        <Ban className="w-4 h-4 shrink-0" />
        <span>
          {t("This workspace is suspended.")} <span className="opacity-80">{t("You can view and export your data, but not make changes.")}</span>
        </span>
      </span>
      <Link
        to="/help"
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-destructive-foreground/15 hover:bg-destructive-foreground/25 transition-colors font-medium shrink-0"
      >
        {t("Help & Support")}
      </Link>
    </div>
  );
}
