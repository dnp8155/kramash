import { Users } from "lucide-react";

// Displays roles first, names second.
// If hideTeamNames is true, shows only role + quantity (e.g. "1× Lead Videographer").
export default function PortalTeamSection({ team }) {
  if (!team || team.length === 0) return null;

  // Group by member_type if any exist
  const hasMemberTypes = team.some((t) => t.member_type);
  const groups = {};
  if (hasMemberTypes) {
    for (const t of team) {
      const key = t.member_type || "Team";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Team</h3>
      </div>

      {hasMemberTypes ? (
        <div className="space-y-4">
          {Object.entries(groups).map(([type, members]) => (
            <div key={type}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {formatMemberType(type)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((t, idx) => (
                  <TeamMemberRow key={idx} member={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {team.map((t, idx) => (
            <TeamMemberRow key={idx} member={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamMemberRow({ member }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{member.role || "Team Member"}</div>
        {member.hide ? (
          <div className="text-xs text-muted-foreground">
            {member.quantity > 1 ? `${member.quantity}× ` : "1× "}
            {member.role || "Assigned"}
          </div>
        ) : (
          member.name && (
            <div className="text-xs text-muted-foreground">{member.name}</div>
          )
        )}
      </div>
    </div>
  );
}

function formatMemberType(type) {
  const map = {
    bride_side: "Bride Side",
    groom_side: "Groom Side",
    common: "Common",
    other: "Others"
  };
  return map[type] || type;
}