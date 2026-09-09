import {
  Users,
  CalendarDays,
  Package,
  FileText,
  Wallet,
  TrendingUp,
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Clients & Projects",
    copy: "Keep client details and every related project or event organized in one place.",
    note: "Events for Photography & Event Management — Projects for Architecture & other services.",
  },
  {
    icon: CalendarDays,
    title: "Team & Availability",
    copy: "Assign team members, track roles and rates, and identify scheduling conflicts before they become problems.",
  },
  {
    icon: Package,
    title: "Services & Rate Estimator",
    copy: "Configure your services and rates, then create fast estimates using real team and service costs.",
  },
  {
    icon: FileText,
    title: "Professional Quotations",
    copy: "Build branded quotations with services, discounts, optional GST, terms and polished PDF output.",
  },
  {
    icon: Wallet,
    title: "Payments & Expenses",
    copy: "Record client receipts, team payments and business expenses without maintaining separate ledgers.",
  },
  {
    icon: TrendingUp,
    title: "Profitability",
    copy: "Know what you've received, what's pending, what you've paid and what each project or event actually earned.",
  },
];

export default function CoreFeatures() {
  return (
    <section id="product" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Core workspace
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[42px]">
            Everything you need to manage the work.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            From the first client enquiry to final profitability, your core business workflow
            stays connected.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {feature.copy}
              </p>
              {feature.note && (
                <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
                  {feature.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}