import { Camera, CalendarDays, Building2, Briefcase } from "lucide-react";

const INDUSTRIES = [
  {
    icon: Camera,
    title: "Photography",
    copy: "Manage clients, shoots and events, crew assignments, service packages, quotations and payments from one workspace.",
    chips: ["Events", "Crew", "Services", "Quotations", "Payments"],
  },
  {
    icon: CalendarDays,
    title: "Event Management",
    copy: "Keep every event, team assignment, service, quotation and financial update organized from planning to completion.",
    chips: ["Events", "Team", "Availability", "Services", "Financials"],
  },
  {
    icon: Building2,
    title: "Architecture",
    copy: "Manage clients, projects, project sites, teams, professional services, quotations and project financials without event-specific workflows.",
    chips: ["Projects", "Project Sites", "Project Team", "Services", "Billing"],
  },
  {
    icon: Briefcase,
    title: "Other Service Businesses",
    copy: "Configure your own services, team roles and projects while keeping the same powerful Kramashah workflow.",
    chips: ["Custom Roles", "Custom Services", "Projects", "Quotations", "Finance"],
    footnote: "Interior Design, Agencies, Consulting, Production and more.",
  },
];

export default function IndustrySection() {
  return (
    <section id="industries" className="bg-[#F7F9FC] py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Built around your business
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[42px]">
            One platform. Your terminology. Your workflow.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Kramashah adapts to the way your business works instead of forcing every industry
            into the same vocabulary.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((ind, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ind.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{ind.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {ind.copy}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {ind.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              {ind.footnote && (
                <p className="mt-3 border-t border-border pt-3 text-xs italic text-muted-foreground">
                  {ind.footnote}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}