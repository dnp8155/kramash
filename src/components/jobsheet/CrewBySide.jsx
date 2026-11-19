// A day's team grouped by side, styled like the client portal's Team card (PortalTeamSection):
// uppercase side heading, then role in bold with the member's name under it (or "2× Role" lines).
export default function CrewBySide({ groups }) {
  return (
    <div className="space-y-3 min-w-0">
      {groups.map((g) => (
        <div key={g.side}>
          {g.heading && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{g.heading}</div>}
          {g.items.map((it, i) => it.count ? (
            <div key={i} className="text-sm font-medium text-foreground py-0.5">{`${it.count}× ${it.role}`}</div>
          ) : (
            <div key={i} className="py-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{it.role}</div>
              {it.name && <div className="text-xs text-muted-foreground">{it.name}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
