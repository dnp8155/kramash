// Reusable member type tag — paints in the configured color from workspace preferences.
// On card/table views (cardView=true), the tag is hidden entirely when "Show member type"
// is OFF. Event Details and other pages are not affected — always show the colored tag.
// Color is resolved from the type definition (single source of truth) via typeId (preferred) or label.
// Uses .type-dot class on the inner dot so the global "Show status dots" preference can hide it.
import { cn } from "@/lib/utils";
import { useDisplayPreferences, useMemberTypeColors } from "@/hooks/useDisplayPreferences";

export default function MemberTypeTag({ label, typeId, className, cardView = false }) {
  const { showMemberTypeColors } = useDisplayPreferences();
  const getColor = useMemberTypeColors();

  if (!label && !typeId) return null;

  // On card/table views, hide entirely when "Show member type" is OFF.
  if (cardView && !showMemberTypeColors) return null;

  const color = getColor(typeId || label);

  // If type definition not found, treat as unassigned — show plain text, no arbitrary color.
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
      <span className="type-dot w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}