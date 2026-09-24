import { Users } from "lucide-react";
import { formatAssignedDates } from "@/lib/dates";
import MemberTypeTag from "@/components/common/MemberTypeTag";
import { useMemberTypeColors } from "@/hooks/useDisplayPreferences";

export default function TeamBookingBySide({ assignments = [], membersById = {}, event }) {
  const getColor = useMemberTypeColors();
  const active = assignments.filter((a) => a.assignment_status !== "removed");
  if (active.length === 0) return null;

  const groups = {};
  const order = [];
  for (const a of active) {
    const key = a.member_type_snapshot || "Common";
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(a);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
        <span className="text-xs text-muted-foreground">({active.length})</span>
      </div>

      <div className="space-y-4">
        {order.map((side) => {
          const color = getColor(side);
          return (
          <div key={side}>
            <div className="mb-2">
              <MemberTypeTag label={side} className="text-[10px] uppercase tracking-wide px-2 py-0.5" />
            </div>
            <ul className="space-y-1.5">
              {groups[side].map((a) => {
                const m = membersById[a.team_member_id];
                const name = m?.name || "Unknown member";
                const role = a.role_name_snapshot || m?.profession || "—";
                const dates = formatAssignedDates(a, event);
                return (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <Users
                      className="w-3.5 h-3.5 mt-[3px] shrink-0 type-dot"
                      style={color ? { color } : undefined}
                    />
                    <div className="min-w-0 break-anywhere" style={color ? { color } : undefined}>
                      <span className="font-medium">{name}</span>
                      <span> — {role} — </span>
                      <span>{dates}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </div>
    </div>
  );
}