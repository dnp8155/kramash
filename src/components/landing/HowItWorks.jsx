const STEPS = [
  {
    num: "01",
    title: "Set up your workspace",
    copy: "Choose your business category, configure services and set up your team roles.",
  },
  {
    num: "02",
    title: "Add clients and work",
    copy: "Create projects or events, assign team members and keep every detail connected.",
  },
  {
    num: "03",
    title: "Quote, collect and track",
    copy: "Create quotations, record payments and understand your real profitability.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[42px]">
            From setup to getting paid in three simple steps.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="absolute top-7 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-border to-transparent md:block" />
              )}

              <div className="relative flex flex-col items-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white text-lg font-bold text-primary shadow-sm">
                  {step.num}
                </div>
                <h3 className="mt-5 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}