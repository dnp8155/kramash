import { Users } from "lucide-react";

export default function PortalTeamSection({ teamAssignments, quotationItems, hideTeamNames }) {
  // Use event team assignments if available; otherwise fall back to quotation role items
  const hasEventTeam = teamAssignments && teamAssignments.length > 0;

  const roleItems = (quotationItems || []).filter((i) => i.item_type === "role");

  if (!hasEventTeam && roleItems.length === 0) return null;

  // Build display list: role first, name second
  let displayList = [];
  if (hasEventTeam) {
    displayList = teamAssignments.map((a) => ({
      role: a.role_name || "Team Member",
      name: hideTeamNames ? null : a.member_name,
    }));
  } else {
    // Group role items by name (role) and count
    const roleMap = {};
    roleItems.forEach((item) => {
      const role = item.name || "Team Member";
      if (!roleMap[role]) roleMap[role] = { role, count: 0 };
      roleMap[role].count += item.quantity || 1;
    });
    displayList = Object.values(roleMap).map((r) => ({
      role: r.role,
      name: hideTeamNames ? null : null, // no names from quotation items
      count: r.count,
    }));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Team</h3>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {displayList.map((entry, idx) => (
          <div key={idx} className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{entry.role}</p>
            {entry.name ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{entry.name}</p>
            ) : entry.count > 1 ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{entry.count}× {entry.role}</p>
            ) : hideTeamNames ? (
              <p className="mt-0.5 text-sm text-muted-foreground">1× {entry.role}</p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">—</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}