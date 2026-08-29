import { ChevronLeft, ChevronRight } from "lucide-react";
import Logo from "@/components/common/Logo";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { categoryLabel } from "@/lib/businessTerminology";
import { cn } from "@/lib/utils";

export default function WorkspaceSwitcher({ mobile = false, collapsed = false, onToggleCollapse }) {
  const { workspace } = useWorkspace();
  const term = useBusinessTerminology();

  const sub =
    workspace?.business_category === "OTHER" && workspace?.custom_business_type
      ? workspace.custom_business_type
      : categoryLabel(term.category);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-3">
        <Logo size={36} />
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Expand panel"
          title="Expand"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <Logo size={48} />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight tracking-wide uppercase text-foreground truncate">
            KRAMAS
          </div>
          <div className="text-xs text-muted-foreground truncate">{sub}</div>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Collapse panel"
          title="Collapse"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}