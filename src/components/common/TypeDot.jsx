// TypeDot — renders a small circular dot using the member type's configured color.
// Color is resolved from the type definition (single source of truth), never stored on the member.
// Uses the .type-dot class so the global "Show status dots" preference can hide it via CSS.
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getMemberTypeColor } from "@/lib/memberTypeService";
import { cn } from "@/lib/utils";

export default function TypeDot({ typeId, label, size = "sm", className }) {
  const { workspace } = useWorkspace();
  const color = getMemberTypeColor(workspace, typeId || label);

  // If type definition not found, do not render a dot (treat as unassigned)
  if (!color) return null;

  const sizeClass = size === "lg" ? "w-3 h-3" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <span
      className={cn("type-dot inline-block rounded-full shrink-0", sizeClass, className)}
      style={{ backgroundColor: color }}
    />
  );
}