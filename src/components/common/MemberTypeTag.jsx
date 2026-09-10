// Reusable member type tag — paints in the configured color from workspace preferences
// when "Show member type colors" is ON, or renders plain text when OFF.
import { cn } from "@/lib/utils";
import { useDisplayPreferences, useMemberTypeColors } from "@/hooks/useDisplayPreferences";

export default function MemberTypeTag({ label, className }) {
  const { showMemberTypeColors } = useDisplayPreferences();
  const getColor = useMemberTypeColors();

  if (!label) return null;

  if (!showMemberTypeColors) {
    return (
      <span className={cn("text-[10px] font-semibold text-foreground", className)}>
        {label}
      </span>
    );
  }

  const color = getColor(label);
  return (
    <span
      className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold", className)}
      style={{ backgroundColor: color + "20", color: color }}
    >
      {label}
    </span>
  );
}