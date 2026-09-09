import {
  MessageSquare,
  Table,
  Files,
  StickyNote,
  Calculator,
  Users,
  CalendarDays,
  FileText,
  Wallet,
  TrendingUp,
  User,
} from "lucide-react";

const FRAGMENTED_TOOLS = [
  { icon: MessageSquare, label: "WhatsApp", sub: "Client details" },
  { icon: Table, label: "Spreadsheet", sub: "Team availability" },
  { icon: Files, label: "Documents", sub: "Quotations" },
  { icon: StickyNote, label: "Notes", sub: "Payments" },
  { icon: Calculator, label: "Calculator", sub: "Profit" },
];

const CONNECTED_FLOW = [
  { icon: User, label: "Client" },
  { icon: CalendarDays, label: "Project / Event" },
  { icon: Users, label: "Team" },
  { icon: FileText, label: "Quotation" },
  { icon: Wallet, label: "Payment" },
  { icon: TrendingUp, label: "Profit" },
];

export default function ProblemSolution() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[42px]">
            Your business shouldn't run across five different tools.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Fragmented tools */}
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Scattered across tools
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FRAGMENTED_TOOLS.map((tool, i) => (
                <div
                  key={i}
                  className={`rounded-xl border border-border bg-muted/30 p-4 ${
                    i % 2 === 0 ? "translate-y-2" : "-translate-y-1"
                  } ${i === 1 ? "translate-x-2" : ""} ${i === 3 ? "-translate-x-2" : ""}`}
                >
                  <tool.icon className="h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">{tool.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Connected workflow */}
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-primary">
              One connected workspace
            </p>
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-1">
                {CONNECTED_FLOW.map((step, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{step.label}</span>
                    </div>
                    {i < CONNECTED_FLOW.length - 1 && (
                      <div className="ml-5 flex h-5 items-center">
                        <div className="h-full w-px bg-border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Kramashah turns the entire workflow into one connected system.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}