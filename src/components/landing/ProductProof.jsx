import React from "react";
import { Building2, FileText, Clock, Layers } from "lucide-react";

const stats = [
  { icon: Building2, value: "4 Business Types", label: "Multi-industry ready" },
  { icon: FileText, value: "GST Ready", label: "Professional quotations" },
  { icon: Clock, value: "24 / 7", label: "Cloud access" },
  { icon: Layers, value: "One Workspace", label: "From client to profit" },
];

export default function ProductProof() {
  return (
    <section className="border-y border-border/60 bg-[#F7F9FC]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-heading text-base font-bold text-foreground leading-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}