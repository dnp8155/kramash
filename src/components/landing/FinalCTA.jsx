import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="bg-foreground py-20 md:py-28">
      <div className="mx-auto max-w-[800px] px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl md:text-[42px]">
          Run your business with everything in one place.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-background/70">
          Clients, projects, teams, quotations and finances — connected from day one.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            data-cta="final_cta_start"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-background px-7 text-base font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            data-cta="final_cta_login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-background/20 px-7 text-base font-semibold text-background transition-colors hover:bg-background/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}