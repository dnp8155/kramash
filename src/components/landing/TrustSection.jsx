import React from "react";
import { ShieldCheck, Lock, Server, Cloud } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "Workspace-isolated data", desc: "Every business's data stays separate with row-level security." },
  { icon: Lock, title: "Protected access", desc: "Authentication and session management handled securely." },
  { icon: Server, title: "Backend plan enforcement", desc: "Plan limits enforced server-side, not just in the UI." },
  { icon: Cloud, title: "Cloud-based workspace", desc: "Access your business data from anywhere, on any device." },
];

export default function TrustSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Built for serious business data.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item) => (
            <div key={item.title} className="text-center sm:text-left">
              <div className="inline-flex sm:flex w-11 h-11 rounded-xl bg-primary/8 items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}