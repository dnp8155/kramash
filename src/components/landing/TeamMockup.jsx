import { AlertTriangle } from "lucide-react";

const DATES = ["Oct 14", "Oct 15", "Oct 16", "Oct 17", "Oct 18"];

const MEMBERS = [
  {
    name: "Arjun Patel",
    role: "Lead Photographer",
    assignments: [null, "Sharma Wedding", "Sharma Wedding", null, null],
  },
  {
    name: "Priya Shah",
    role: "Cinematographer",
    assignments: [null, "Sharma Wedding", "Sharma Wedding", "IIT Bombay", "IIT Bombay"],
  },
  {
    name: "Rohan Das",
    role: "Drone Operator",
    assignments: ["Mehta Shoot", null, { name: "Sharma Wedding", conflict: true }, null, null],
  },
  {
    name: "Neha Gupta",
    role: "Album Editor",
    assignments: [null, null, null, "IIT Bombay", "IIT Bombay"],
  },
];

export default function TeamMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
      {/* Header */}
      <div className="border-b border-border bg-muted/20 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground">Team Availability</h4>
            <p className="text-[10px] text-muted-foreground">Oct 14 — Oct 18, 2026</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <AlertTriangle className="h-3 w-3" /> 1 conflict
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Team Member</th>
              {DATES.map((d) => (
                <th key={d} className="px-2 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.role}</p>
                    </div>
                  </div>
                </td>
                {m.assignments.map((a, j) => (
                  <td key={j} className="px-1.5 py-3 text-center">
                    {a === null ? (
                      <span className="mx-auto block h-1 w-1 rounded-full bg-border" />
                    ) : typeof a === "object" && a.conflict ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-1 py-1 text-[9px] font-semibold text-destructive">
                        {a.name.split(" ")[0]}
                      </div>
                    ) : (
                      <div className="rounded-md bg-primary/10 px-1 py-1 text-[9px] font-medium text-primary">
                        {a.split(" ")[0]}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-muted/10 px-5 py-2.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>4 team members · 3 active assignments</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary/30" /> Assigned
            <span className="ml-2 h-2 w-2 rounded-full bg-destructive/30" /> Conflict
          </span>
        </div>
      </div>
    </div>
  );
}