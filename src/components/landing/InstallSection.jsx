import React from "react";
import { Link } from "react-router-dom";
import { Zap, BellRing, Home, Lock, RefreshCw, Download, Globe, MousePointerClick, Smartphone, ArrowRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import InstallGuide from "@/components/common/InstallGuide";
import { useInstallPrompt } from "@/hooks/usePWA";

// The three things that happen, whatever the device — the exact taps for each browser are in the guide.
const QUICK_STEPS = [
  { icon: Globe, title: "Open Kramasha in your browser", desc: "Safari on iPhone, Chrome on Android or desktop." },
  { icon: MousePointerClick, title: "Tap Share or the menu, then Add to Home Screen", desc: "On desktop, click the Install icon in the address bar." },
  { icon: Smartphone, title: "Open it from your home screen", desc: "Full screen, its own icon — just like an app from the store." },
];

// Why install it as an app — all things the installed app really does.
const PERKS = [
  { icon: Zap, title: "Opens instantly", desc: "Full screen, no browser bars." },
  { icon: BellRing, title: "Push notifications", desc: "Event and payment alerts (Pro)." },
  { icon: Home, title: "One tap from home", desc: "Its own icon on your screen." },
  { icon: Lock, title: "App Lock & passkeys", desc: "Fingerprint or face protection." },
  { icon: RefreshCw, title: "One-tap updates", desc: "New features, no store needed." },
  { icon: Download, title: "Light on storage", desc: "Ready in seconds, no app store." },
];

export default function InstallSection() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  return (
    <section id="install" className="relative overflow-hidden py-20 sm:py-28 bg-[#F5F3EF] scroll-mt-4">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-[-8rem] w-[28rem] h-[28rem] rounded-full bg-[#C8A95E]/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C8A95E] mb-4">Install as app</div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
            Get Kramasha on your home screen in 30 seconds.
          </h2>
          <p className="text-[#8A8580] text-base sm:text-lg leading-relaxed">
            There's no app store download. Kramasha installs straight from your browser, then opens full screen like any other app — on iPhone, Android and desktop.
          </p>
        </Reveal>

        {/* On phones the order is: quick steps, the guide for your device, then the perks. On desktop the guide sits on the right beside the other two. */}
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-x-12 items-start">
          <Reveal className="lg:col-start-1 lg:row-start-1">
            <ol className="space-y-3">
              {QUICK_STEPS.map((s, i) => (
                <li key={s.title} className="flex items-start gap-4 rounded-2xl border border-[#E8E3DB] bg-white p-4 sm:p-5">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-[#C8A95E]/15 text-[#A8893F] flex items-center justify-center">
                      <s.icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-[15px] font-semibold text-[#1A1A1A] leading-snug">{s.title}</div>
                    <p className="text-xs sm:text-sm text-[#8A8580] leading-relaxed mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          {/* Exact taps for the visitor's own device and browser (tabs switch device) */}
          <Reveal delay={100} className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-[#E8E3DB] bg-white p-5 sm:p-7 shadow-[0_20px_50px_-30px_rgba(26,26,26,0.25)]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-heading text-lg font-semibold text-[#1A1A1A]">Step-by-step for your device</div>
                  <div className="text-xs text-[#8A8580]">We've opened the tab that matches what you're using.</div>
                </div>
                {installed && <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">Installed</span>}
              </div>
              <InstallGuide canInstall={canInstall} onInstall={promptInstall} tabsId="install-family-landing" />
            </div>
          </Reveal>

          <Reveal className="lg:col-start-1 lg:row-start-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PERKS.map((b) => (
                <div key={b.title} className="rounded-xl border border-[#E8E3DB] bg-[#FAF8F4] p-3.5">
                  <b.icon className="w-4 h-4 text-[#C8A95E] mb-2" strokeWidth={1.75} />
                  <div className="text-[13px] font-semibold text-[#1A1A1A] leading-snug">{b.title}</div>
                  <p className="text-[11px] text-[#8A8580] leading-relaxed mt-0.5">{b.desc}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs text-[#8A8580] leading-relaxed">
              Prefer not to install? Kramasha works in any browser too — <Link to="/register" className="font-semibold text-[#1A1A1A] underline underline-offset-2 hover:text-[#A8893F]">create your free account <ArrowRight className="inline w-3 h-3" /></Link>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
