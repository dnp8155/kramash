import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import Button from "@/components/common/Button";
import { faqContent } from "@/lib/legalContent";

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-sm">K</div>
            KRAMAS
          </Link>
          <Link to="/login">
            <Button size="sm" variant="outline">Sign in</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Frequently Asked Questions</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Everything you need to know about KRAMAS — pricing, data, features and setup.
        </p>

        <div className="space-y-3">
          {faqContent.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card shadow-xs overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="font-heading text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to KRAMAS</Link>
        </div>
      </main>
    </div>
  );
}