import { Users } from "lucide-react";
import { formatAssignedDates } from "@/lib/dates";
import MemberTypeTag from "@/components/common/MemberTypeTag";

// Date-wise team booking visibility: groups active team assignments by their
// event-specific Member Type / Side and shows each member's name, role and the
// exact dates they were assigned (from the assignment record, not the event range).
export default function TeamBookingBySide({ assignments = [], membersById = {}, event }) {
  const active = assignments.filter((a) => a.assignment_status !== "removed");
  if (active.length === 0) return null;

  // Group by member_type_snapshot, preserving first-appearance order.
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
        {order.map((side) => (
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
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[7px] shrink-0" />
                    <div className="min-w-0 break-anywhere">
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="text-muted-foreground"> — {role} — </span>
                      <span className="text-muted-foreground">{dates}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}