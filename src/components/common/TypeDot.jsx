import { useWorkspace } from "@/lib/WorkspaceContext";
import { getMemberTypeColor } from "@/lib/memberTypeService";
import { cn } from "@/lib/utils";

export default function TypeDot({ typeId, label, size = "sm", className }) {
  const { workspace } = useWorkspace();
  const color = getMemberTypeColor(workspace, typeId || label);

  if (!color) return null;

  const sizeClass = size === "lg" ? "w-3 h-3" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <span
      className={cn("type-dot inline-block rounded-full shrink-0", sizeClass, className)}
      style={{ backgroundColor: color }}
    />
  );
}