import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-[2rem] bg-[#1A1A1A] px-6 py-14 sm:px-12 sm:py-16 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-white max-w-2xl mx-auto">
            Stop managing your studio across 10 different apps.
          </h2>
          <p className="mt-4 text-[#999] max-w-xl mx-auto">
            Clients, projects, teams, quotations and finances — connected from day one.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="final_cta_start h-12 px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#F58220] text-white hover:bg-[#E0741F] rounded-full transition-all"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="h-12 px-8 inline-flex items-center justify-center text-sm font-medium border border-[#333] text-white hover:bg-[#222] rounded-full transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}