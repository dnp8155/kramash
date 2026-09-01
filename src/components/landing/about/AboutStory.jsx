import React from "react";
import { Quote } from "lucide-react";

export default function AboutStory() {
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left — narrative */}
          <div className="lg:col-span-7">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Why we built this</p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight mb-6">
              The real work isn't the event. It's everything around it.
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                If you run an event, a photography studio, an architecture practice, or any business built around jobs and a team — you already know this. The shoot is the easy part. The hard part is who's confirmed for which day, who still owes what, whether the quotation went out, whether the advance came in, whether two team members got double-booked on the same wedding.
              </p>
              <p>
                Most small and growing businesses in this space run on Excel sheets and memory. It works — until it doesn't. A missed follow-up, a forgotten payment, a team member booked twice by accident. The cost isn't just money; it's the mental load of holding it all in your head.
              </p>
              <p>
                Kramasha exists to take that load off your plate. One workspace. Every event, every payment, every team member — <span className="font-semibold text-foreground">in order</span>.
              </p>
            </div>
          </div>

          {/* Right — quote card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-border bg-background p-8 shadow-md">
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              <p className="font-heading text-lg sm:text-xl font-medium text-foreground leading-snug">
                We're not building software to replace how you run your business. We're building it so you can finally stop running it from your memory.
              </p>
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-sm font-semibold text-foreground">The Kramasha team</p>
                <p className="text-xs text-muted-foreground mt-0.5">Built with real studios and event businesses, in the loop.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}