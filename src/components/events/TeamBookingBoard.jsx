import { useMemo } from "react";
import { formatDate } from "@/utils/format";
import SelfBadge from "@/components/common/SelfBadge";
import { isSelfMember } from "@/utils/selfDetection";

// Displays team members booked for an event, grouped by their event-specific
// Member Side / category_type. Shows each member's name, role, and the exact
// working dates from their assignment record (not the event's full date range).
//
// Side labels and colors come from the category_type field on the assignment.
// "Bride" → pink, "Groom" → blue, "Other"/null → neutral. Custom side values
// get a neutral badge with the custom label.
const sideConfig = {
  Bride: { badge: "bg-pink-100 text-pink-700 border-pink-200", label: "Bride Side" },
  Groom: { badge: "bg-blue-100 text-blue-700 border-blue-200", label: "Groom Side" },
  Other: { badge: "bg-muted text-muted-foreground border-border", label: "Common" },
};
const sideOrder = ["Bride", "Groom", "Other"];

export default function TeamBookingBoard({ assignments = [], members = [], ownerName = "" }) {
  const groups = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const side = a.category_type || "Other";
      if (!map[side]) map[side] = [];
      map[side].push(a);
    });
    return map;
  }, [assignments]);

  const sides = useMemo(
    () => [
      ...sideOrder.filter((s) => groups[s]?.length),
      ...Object.keys(groups).filter((s) => !sideOrder.includes(s)),
    ],
    [groups]
  );

  if (sides.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {sides.map((side) => {
        const config = sideConfig[side] || {
          badge: "bg-muted text-muted-foreground border-border",
          label: side,
        };
        return (
          <div key={side}>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}
            >
              {config.label}
            </span>
            <div className="mt-2 flex flex-col gap-2 pl-1">
              {groups[side].map((a) => {
                const member = members.find((m) => m.id === a.team_member_id);
                const isSelf = member && isSelfMember(member.name, ownerName);
                const dates = (a.working_dates || []).map(formatDate).join(", ");
                return (
                  <div key={a.id} className="flex flex-col">
                    <p className="text-sm font-medium text-foreground">
                      {member?.name || "Unknown"}
                      {isSelf && <SelfBadge className="ml-1.5" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.role_name_snapshot || "—"}
                      {dates && ` · ${dates}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}