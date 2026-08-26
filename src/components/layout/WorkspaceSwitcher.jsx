import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Settings, Building2 } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { categoryLabel } from "@/lib/businessTerminology";
import { cn } from "@/lib/utils";

export default function WorkspaceSwitcher({ mobile = false, onClose }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const term = useBusinessTerminology();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const name = workspace?.name || "Kramashah";
  const sub = categoryLabel(term.category);

  return (
    <div className="relative px-3 py-3" ref={ref}>
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
          {(name || "K").charAt(0).toUpperCase()}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight tracking-wide uppercase text-foreground truncate">
            {name}
          </div>
          <div className="text-xs text-muted-foreground truncate">{sub}</div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Toggle panel"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div className="absolute top-full left-3 right-3 mt-1.5 bg-card border border-border rounded-lg shadow-lg z-50 animate-fade-in overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{name}</div>
              {workspace?.email && (
                <div className="text-xs text-muted-foreground truncate">{workspace.email}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/settings");
              if (mobile && onClose) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            Workspace Settings
          </button>
        </div>
      )}
    </div>
  );
}