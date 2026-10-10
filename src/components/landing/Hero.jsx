import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CalendarDays, FileCheck2, IndianRupee, Users, TrendingUp } from "lucide-react";
import MobilePreview from "@/components/landing/previews/MobilePreview";
import Reveal from "@/components/landing/Reveal";
import { HERO_PROFILES } from "@/components/landing/heroProfiles";

// Small app "moments" floating around the phone — the hero shows the product
// as live activity rather than the full dashboard (that lives in ProductShowcase).
function FloatCard({ className = "", children }) {
  return (
    <div className={`absolute z-20 rounded-2xl border border-[#E8E3DB] bg-white/95 backdrop-blur px-3.5 py-3 shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function IconChip({ icon: Icon, tone = "gold" }) {
  const tones = {
    gold: "bg-[#C8A95E]/15 text-[#A8893F]",
    green: "bg-emerald-50 text-emerald-600",
    dark: "bg-[#1A1A1A] text-white",
  };
  return (
    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
      <Icon className="w-4 h-4" strokeWidth={2} />
    </span>
  );
}

export default function Hero() {
  // The chip you pick drives the phone and the floating cards (heroProfiles.js).
  const [activeId, setActiveId] = useState(HERO_PROFILES[0].id);
  const profile = HERO_PROFILES.find((x) => x.id === activeId) || HERO_PROFILES[0];
  const EventIcon = profile.icon;
  return (
    <section className="relative overflow-hidden bg-[#F5F3EF] pt-8 pb-20 sm:pt-12 sm:pb-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="flex flex-col items-start">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DB] bg-white px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-[#8A8580] uppercase mb-6">
                <span className="text-[#C8A95E]">✦</span>
                Plan · Manage · Deliver · Grow
              </div>
            </Reveal>

            <Reveal delay={50}>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-[#1A1A1A] leading-[1.05] mb-5">
                Built for Creative Businesses.
              </h1>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-base sm:text-lg text-[#8A8580] leading-relaxed mb-7 max-w-xl">
                Manage clients, events, teams, services, quotations, invoices, payments and finances — all in one place.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="flex flex-wrap gap-2 mb-7">
                {HERO_PROFILES.map((p) => {
                  const on = p.id === activeId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      aria-pressed={on}
                      className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-all duration-300 ${
                        on
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm"
                          : "bg-white text-[#1A1A1A] border-[#E8E3DB] hover:border-[#C8A95E] hover:text-[#8A6D2B]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex w-full sm:w-auto mb-6">
                <Link to="/register" className="h-12 px-7 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#C8A95E] rounded-full transition-all">
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={250}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {["No credit card required", "Quick setup", "Built for creative businesses"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs text-[#8A8580]">
                    <Check className="w-3.5 h-3.5 text-[#C8A95E]" strokeWidth={2.5} />
                    {t}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative">
            {/* On small screens only three cards show so the phone stays readable */}
            <div className="relative mx-auto w-full max-w-[520px] h-[520px] sm:h-[560px] flex items-center justify-center">
              {/* Soft gold stage behind the phone */}
              <div className="absolute inset-x-6 inset-y-10 rounded-[3rem] bg-gradient-to-br from-[#C8A95E]/20 via-white/60 to-[#C8A95E]/5 border border-[#E8E3DB]" />
              <div className="absolute -inset-4 bg-[#C8A95E]/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                <MobilePreview profile={profile} />
              </div>

              <FloatCard className="top-6 left-0 sm:-left-4 w-[190px]">
                <div className="flex items-center gap-2.5">
                  <IconChip icon={EventIcon} tone="dark" />
                  <div className="min-w-0 animate-fade-in" key={profile.id}>
                    <div className="text-[11px] font-semibold text-[#1A1A1A] truncate">{profile.event.title}</div>
                    <div className="text-[10px] text-[#8A8580]">{profile.event.meta}</div>
                  </div>
                </div>
              </FloatCard>

              <FloatCard className="top-24 right-0 sm:-right-4 w-[170px]">
                <div className="flex items-center gap-2.5">
                  <IconChip icon={IndianRupee} tone="green" />
                  <div>
                    <div className="text-[10px] text-[#8A8580]">Payment received</div>
                    <div key={profile.id} className="text-sm font-bold text-[#1A1A1A] animate-fade-in">{profile.payment}</div>
                  </div>
                </div>
              </FloatCard>

              <FloatCard className="hidden sm:block top-[46%] -left-8 w-[180px]">
                <div className="flex items-center gap-2.5">
                  <IconChip icon={FileCheck2} />
                  <div>
                    <div className="text-[11px] font-semibold text-[#1A1A1A]">Quotation approved</div>
                    <div key={profile.id} className="text-[10px] text-[#8A8580] animate-fade-in">by {profile.quoteBy} · just now</div>
                  </div>
                </div>
              </FloatCard>

              <FloatCard className="bottom-24 right-0 sm:-right-6 w-[170px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#8A8580]">Revenue</span>
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                    <TrendingUp className="w-3 h-3" /> {profile.growth}
                  </span>
                </div>
                <div className="flex items-end gap-1 h-8">
                  {profile.chart.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-[#C8A95E] transition-[height] duration-500" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
                  ))}
                </div>
              </FloatCard>

              <FloatCard className="hidden sm:block bottom-6 left-0 w-[190px]">
                <div className="flex items-center gap-2.5">
                  <IconChip icon={Users} />
                  <div>
                    <div className="text-[11px] font-semibold text-[#1A1A1A]">New lead</div>
                    <div key={profile.id} className="text-[10px] text-[#8A8580] animate-fade-in">{profile.lead.name} · {profile.lead.what}</div>
                  </div>
                </div>
              </FloatCard>

              <FloatCard className="hidden sm:block bottom-0 right-10 !py-2 !px-3">
                <div className="flex items-center gap-2 text-[10px] font-medium text-[#1A1A1A]">
                  <CalendarDays className="w-3.5 h-3.5 text-[#C8A95E]" /> <span key={profile.id} className="animate-fade-in">{profile.week}</span>
                </div>
              </FloatCard>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
