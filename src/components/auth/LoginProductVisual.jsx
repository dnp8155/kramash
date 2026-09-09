// A realistic Kramashah app interface crop — not a fake widget panel.
// Shows a Projects list with sidebar navigation, mimicking the real product
// to serve as silent, environmental product proof on the login page.

const NAV_ITEMS = [
  { label: "Dashboard", active: false },
  { label: "Projects", active: true },
  { label: "Clients", active: false },
  { label: "Team", active: false },
  { label: "Financials", active: false },
];

const PROJECTS = [
  {
    title: "Residence Design",
    client: "A. Mehta",
    date: "Sep 12",
    status: "In Progress",
    statusClass: "bg-info/10 text-info",
    avatars: [
      { bg: "#6366f1", initials: "AM" },
      { bg: "#818cf8", initials: "RS" },
    ],
    teamCount: "4",
  },
  {
    title: "Corporate Summit 2026",
    client: "Verma Corp",
    date: "Sep 18",
    status: "Confirmed",
    statusClass: "bg-success/10 text-success",
    avatars: [
      { bg: "#f59e0b", initials: "JK" },
      { bg: "#6366f1", initials: "PV" },
      { bg: "#10b981", initials: "DN" },
    ],
    teamCount: "8",
  },
  {
    title: "Studio Portrait Session",
    client: "R. Kapoor",
    date: "Sep 24",
    status: "Pending",
    statusClass: "bg-warning/10 text-warning",
    avatars: [{ bg: "#818cf8", initials: "RK" }],
    teamCount: "2",
  },
];

export default function LoginProductVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="flex h-[480px]">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-border bg-muted/30 p-4 sm:block">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              K
            </div>
            <span className="text-sm font-semibold text-foreground">Kramashah</span>
          </div>
          <nav className="mt-6 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs ${
                  item.active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.active ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden p-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Projects</h3>
              <p className="text-xs text-muted-foreground">3 active · 1 pending</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-32 rounded-md border border-border bg-muted/30" />
              <div className="h-8 w-8 rounded-full bg-primary/10" />
            </div>
          </div>

          {/* Project list */}
          <div className="mt-5 space-y-2.5">
            {PROJECTS.map((p) => (
              <div
                key={p.title}
                className="rounded-lg border border-border bg-card p-3.5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {p.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.client} · {p.date}
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${p.statusClass}`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {p.avatars.map((a, i) => (
                      <div
                        key={i}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[8px] font-semibold text-white"
                        style={{ background: a.bg }}
                      >
                        {a.initials}
                      </div>
                    ))}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium text-muted-foreground">
                      +{parseInt(p.teamCount) - p.avatars.length}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {p.teamCount} assigned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}