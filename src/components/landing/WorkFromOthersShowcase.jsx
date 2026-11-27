import React from "react";
import { Check, Handshake, ChevronRight, ArrowRight, CheckCircle2, Upload } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

// Landing: "Work from others" — a member who also runs their business on Kramasha sees the jobs other businesses
// book them for, in their own app: on their calendar and, unless they switch it off, as their next 3 jobs on their
// Events page (cocoa brown + dashed outline, the colour the app uses for these).
const BROWN = "#7C5A3C";

const POINTS = [
  "On your calendar, in brown",
  "Next 3 jobs on your Events page",
  "Payments and receipts from each business",
  "Totals from every business",
  "Updates when they change it",
  "Free on every plan",
];

// The Events page strip, in small: header like the Dashboard widgets, rows with the round chevron.
const NEXT = [
  { biz: "Studio Rana", title: "Kapoor Sangeet", when: "Tomorrow", strong: true },
  { biz: "Lumen Films", title: "Pre-wedding", when: "Upcoming" },
];

// A tiny week: their own jobs (gold) and bookings from other businesses (brown, dashed).
const DAYS = [
  { d: "Mon", n: 11, items: [{ own: true, label: "Mehta" }] },
  { d: "Tue", n: 12, items: [{ own: false, label: "Rana" }] },
  { d: "Wed", n: 13, items: [] },
  { d: "Thu", n: 14, items: [{ own: false, label: "Lumen" }, { own: true, label: "Pre-wed" }] },
  { d: "Fri", n: 15, items: [{ own: true, label: "Shoot" }] },
];

function WeekPreview() {
  return (
    <div className="rounded-2xl border border-[#E8E3DB] bg-white p-4 sm:p-5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#1A1A1A]">Your calendar</div>
        <div className="flex items-center gap-3 text-[11px] text-[#8A8580]">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#C8A95E]" /> Your work</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: BROWN }} /> From others</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {DAYS.map((day) => (
          <div key={day.d} className="min-w-0 rounded-lg border border-[#EFEBE4] p-1.5 sm:p-2 min-h-[118px] flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wide text-[#8A8580]">{day.d}</div>
            <div className="text-sm font-semibold text-[#1A1A1A] mb-0.5">{day.n}</div>
            {day.items.map((it) => (
              <div
                key={it.label}
                className="text-[9px] sm:text-[10px] leading-tight rounded px-1 py-0.5 border truncate"
                style={it.own
                  ? { background: "rgba(200,169,94,0.12)", borderColor: "rgba(200,169,94,0.45)", color: "#8C7235" }
                  : { background: "rgba(124,90,60,0.08)", borderColor: "rgba(124,90,60,0.55)", borderStyle: "dashed", color: BROWN }}
              >
                {it.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* On the Events page */}
      <div className="mt-4 rounded-xl border border-dashed overflow-hidden" style={{ borderColor: "rgba(124,90,60,0.55)" }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(124,90,60,0.25)" }}>
          <span className="flex items-center gap-1.5 min-w-0">
            <Handshake className="w-3.5 h-3.5 shrink-0" style={{ color: BROWN }} />
            <span className="text-xs font-semibold text-[#1A1A1A] truncate">Work from others</span>
            <span className="text-[10px] font-medium px-1.5 rounded" style={{ color: BROWN, background: "rgba(124,90,60,0.1)" }}>3</span>
          </span>
          <span className="shrink-0 text-[11px] font-medium inline-flex items-center gap-0.5" style={{ color: BROWN }}>View all <ArrowRight className="w-3 h-3" /></span>
        </div>
        {NEXT.map((r) => (
          <div key={r.title} className="flex items-center gap-2 px-3 py-2 border-b last:border-0" style={{ borderColor: "rgba(124,90,60,0.12)" }}>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium truncate" style={{ color: BROWN }}>For {r.biz}</div>
              <div className="text-xs font-semibold text-[#1A1A1A] truncate">{r.title}</div>
            </div>
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded" style={r.strong ? { background: BROWN, color: "#fff" } : { background: "rgba(124,90,60,0.1)", color: BROWN }}>{r.when}</span>
            <span className="shrink-0 w-6 h-6 rounded-full border border-[#E8E3DB] flex items-center justify-center text-[#8A8580]"><ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        ))}
      </div>
      {/* On the Work from others page: a payment with its receipt */}
      <div className="mt-3 rounded-xl border border-[#E8E3DB] px-3 py-2 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B57]" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[#1A1A1A] tabular-nums">₹10,000 <span className="font-normal text-[#8A8580]">from Studio Rana</span></div>
          <div className="text-[10px] text-[#8A8580] truncate">20 Nov · UPI · for Kapoor Sangeet</div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#E8E3DB] px-2 py-0.5 text-[10px] font-medium text-[#1A1A1A]"><Upload className="w-3 h-3" /> Receipt</span>
      </div>
    </div>
  );
}

export default function WorkFromOthersShowcase() {
  return (
    <section id="work-from-others" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: BROWN }}>New · Work from others</div>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-[#1A1A1A] mb-4 leading-tight">
              Freelance for other studios? See those jobs in your own calendar.
            </h2>
            <p className="text-[#8A8580] text-base leading-relaxed mb-6">
              When a business books you on Kramasha, the job shows in your app: on your calendar, as your next jobs on your Events page, and with every payment and its receipt. No more double-booking yourself.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {POINTS.map((p) => (
                <div key={p} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <Check className="w-4 h-4 shrink-0" style={{ color: BROWN }} strokeWidth={2.5} />
                  {p}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl blur-3xl" style={{ background: "rgba(124,90,60,0.06)" }} />
              <div className="relative"><WeekPreview /></div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
