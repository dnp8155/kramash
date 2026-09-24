import { cn } from "@/lib/utils";
import { useDisplayPreferences, useMemberTypeColors } from "@/hooks/useDisplayPreferences";

export default function MemberTypeTag({ label, typeId, className, cardView = false }) {
  const { showMemberTypeColors } = useDisplayPreferences();
  const getColor = useMemberTypeColors();

  if (!label && !typeId) return null;

  if (cardView && !showMemberTypeColors) return null;

  const color = getColor(typeId || label);

  if (!color) {
    return (
      <span className={cn("text-[10px] font-semibold text-foreground", className)}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold", className)}
      style={{ backgroundColor: color + "20", color: color }}
    >
      {label}
    </span>
  );
}