import { Shield, Server, Lock, Cloud } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, label: "Workspace-isolated data" },
  { icon: Server, label: "Backend plan enforcement" },
  { icon: Lock, label: "Protected access" },
  { icon: Cloud, label: "Cloud-based workspace" },
];

export default function TrustSection() {
  return (
    <section className="bg-[#F7F9FC] py-16 md:py-20">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Built for serious business data.
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {TRUST_ITEMS.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}