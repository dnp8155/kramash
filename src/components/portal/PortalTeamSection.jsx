import { Users } from "lucide-react";
import { formatDateChip } from "@/lib/dates";

// Team as the client sees it.
//   Names hidden  -> roles only, merged into "2× Lead Photographer" lines.
//   Names visible -> role first, member name under it.
//   Day-wise quotation (mode "day_wise") -> grouped under each day / phase;
//   general quotation (mode "regular")    -> one combined list.
export default function PortalTeamSection({ team, mode, eventDates = [] }) {
  if (!team || team.length === 0) return null;

  const hide = team.some((t) => t.hide);
  const dayWise = mode !== "regular" && team.some((t) => t.day_date);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Team</h3>
      </div>

      {dayWise ? <ByDay team={team} hide={hide} eventDates={eventDates} /> : <Flat team={team} hide={hide} />}
    </div>
  );
}

// "N× Role" lines: identical roles merged, quantities added.
function mergeByRole(list) {
  const map = new Map();
  for (const t of list) {
    const role = t.role || "Team Member";
    map.set(role, (map.get(role) || 0) + (Number(t.quantity) || 1));
  }
  return [...map.entries()].map(([role, count]) => ({ role, count }));
}

function RoleLine({ role, count }) {
  return <div className="text-sm font-medium text-foreground py-1">{`${count}× ${role}`}</div>;
}

function MemberRow({ member }) {
  return (
    <div className="py-1.5 min-w-0">
      <div className="text-sm font-medium text-foreground">{member.role || "Team Member"}</div>
      {member.name && <div className="text-xs text-muted-foreground">{member.name}</div>}
    </div>
  );
}

function List({ team, hide }) {
  return hide ? (
    <div>{mergeByRole(team).map((r) => <RoleLine key={r.role} {...r} />)}</div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">{team.map((t, i) => <MemberRow key={i} member={t} />)}</div>
  );
}

function Flat({ team, hide }) {
  // Names visible + member types set: keep the existing grouping (e.g. Bride side / Groom side).
  if (!hide && team.some((t) => t.member_type)) {
    const groups = {};
    for (const t of team) (groups[t.member_type || "Team"] ||= []).push(t);
    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([type, members]) => (
          <div key={type}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{formatMemberType(type)}</div>
            <List team={members} hide={false} />
          </div>
        ))}
      </div>
    );
  }
  return <List team={team} hide={hide} />;
}

function ByDay({ team, hide, eventDates }) {
  const days = new Map();
  for (const t of team) {
    const key = t.day_date || "";
    if (!days.has(key)) days.set(key, { date: key, title: t.phase_title || "", items: [] });
    const d = days.get(key);
    if (!d.title && t.phase_title) d.title = t.phase_title;
    d.items.push(t);
  }
  const ordered = [...days.values()].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  return (
    <div className="space-y-4">
      {ordered.map((d, i) => (
        <div key={d.date || `x${i}`}>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {d.date ? `${eventDates.includes(d.date) ? `Day ${eventDates.indexOf(d.date) + 1} · ` : ""}${formatDateChip(d.date)}` : "Other"}{d.title ? ` — ${d.title}` : ""}
          </div>
          <List team={d.items} hide={hide} />
        </div>
      ))}
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
