import { Image } from "@/components/ui/image";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { cn } from "@/lib/utils";

/**
 * Unified branding image — renders the workspace logo everywhere it's needed
 * (sidebar footer, workspace switcher, etc.). Falls back to the first letter
 * of the workspace name when no logo is uploaded.
 */
export default function WorkspaceLogo({ size = 36, className = "" }) {
  const { workspace } = useWorkspace();
  const logo = workspace?.logo;
  const initial = (workspace?.name || "K").charAt(0).toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-muted border border-border",
        className
      )}
    >
      {logo ? (
        <Image src={logo} alt={workspace?.name || "Workspace"} fittingType="fill" className="w-full h-full" />
      ) : (
        <span
          className="font-bold text-foreground"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}