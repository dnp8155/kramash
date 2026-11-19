// Festive decoration for the landing page's pricing section only.
//  • Diwali:   marigold toran, diyas, rangoli mandalas, swastik, "श्री गणेशाय नमः".
// Pure SVG/CSS — nothing to download. Animations are off for people who prefer reduced motion.
// (Deity faces are deliberately not drawn in code: drop a proper illustration in /public and set `image` in
// constants/launchOffer.js to show it in the banner.)

import { Gift } from "lucide-react";
import { isFreeMonthNoteVisible, FREE_MONTH_SHORT } from "@/constants/launchOffer";

export function Diya({ className = "w-6 h-6", glow = true }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="diya-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFE9A6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFB020" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="diya-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8923A" />
          <stop offset="100%" stopColor="#B4531A" />
        </linearGradient>
      </defs>
      {glow && <circle cx="24" cy="16" r="14" fill="url(#diya-glow)" className="motion-safe:animate-pulse" />}
      <path d="M24 5c3.5 4.2 5 7.2 5 10a5 5 0 0 1-10 0c0-2.8 1.5-5.8 5-10z" fill="#FFB020" />
      <path d="M24 10c1.7 2.1 2.5 3.6 2.5 5a2.5 2.5 0 0 1-5 0c0-1.4.8-2.9 2.5-5z" fill="#FFF3C4" />
      <path d="M6 24h36c0 9.4-8 16-18 16S6 33.4 6 24z" fill="url(#diya-bowl)" />
      <path d="M6 24h36" stroke="#8A3B0E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 30c3 2 6 3 10 3s7-1 10-3" stroke="#FFD9A0" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// Eight-petal rangoli / mandala.
export function Rangoli({ className = "w-12 h-12" }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {petals.map((r, i) => (
        <ellipse key={r} cx="32" cy="15" rx="5" ry="11" fill={i % 2 ? "#FF7A00" : "#E5322D"} opacity="0.92" transform={`rotate(${r} 32 32)`} />
      ))}
      {petals.map((r) => (
        <circle key={`d${r}`} cx="32" cy="4.5" r="2" fill="#FFD36B" transform={`rotate(${r + 22.5} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="9" fill="#FFD36B" />
      <circle cx="32" cy="32" r="5" fill="#E5322D" />
      <circle cx="32" cy="32" r="2" fill="#FFF3C4" />
    </svg>
  );
}

export function Swastik({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 4v24M4 16h24M16 4h8M16 28H8M4 16V8M28 16v8" stroke="#E5322D" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="9" cy="9" r="1.6" fill="#FFB020" /><circle cx="23" cy="9" r="1.6" fill="#FFB020" />
      <circle cx="9" cy="23" r="1.6" fill="#FFB020" /><circle cx="23" cy="23" r="1.6" fill="#FFB020" />
    </svg>
  );
}

// A string of marigolds (genda phool) with leaves — the Diwali toran.
export function MarigoldToran({ className = "" }) {
  return (
    // No viewBox: the 40px pattern repeats at its real size across any width, instead of stretching on wide screens.
    <svg className={`w-full h-7 ${className}`} aria-hidden="true">
      <defs>
        <pattern id="toran-pattern" width="40" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 3 Q10 12 20 3 T40 3" stroke="#2F7D32" strokeWidth="1.4" fill="none" />
          <path d="M16 6c-3 3-3 7-1 10 4-1 6-5 5-10z" fill="#3E9B41" />
          <path d="M24 6c3 3 3 7 1 10-4-1-6-5-5-10z" fill="#2F7D32" />
          <circle cx="20" cy="17" r="6.5" fill="#F5A300" />
          <circle cx="20" cy="17" r="4.4" fill="#FF7A00" />
          <circle cx="20" cy="17" r="2" fill="#B84A00" />
          <circle cx="3" cy="14" r="3.4" fill="#FFC21A" />
          <circle cx="37" cy="14" r="3.4" fill="#FFC21A" />
        </pattern>
      </defs>
      <rect width="100%" height="28" fill="url(#toran-pattern)" />
    </svg>
  );
}

function Sparkle({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" fill="currentColor" />
    </svg>
  );
}

export function FestiveBanner({ offer }) {
  const showFreeMonth = isFreeMonthNoteVisible();
  const days = offer.daysLeft;
  const copy = offer.copy;
  return (
    <div className="relative max-w-3xl mx-auto mb-12 rounded-2xl p-[2px] bg-gradient-to-r from-[#F5A300] via-[#FF7A00] to-[#C8321E] shadow-lg">
      <div className="relative overflow-hidden rounded-[14px] px-5 sm:px-8 py-6 text-center text-white bg-gradient-to-r from-[#7A1E12] via-[#A32A14] to-[#7A1E12]">
        <Sparkle className="absolute left-4 top-3 w-3 h-3 text-[#FFD36B] motion-safe:animate-pulse" />
        <Sparkle className="absolute right-6 bottom-3 w-2.5 h-2.5 text-[#FFD36B] motion-safe:animate-pulse" />
        <Sparkle className="absolute right-14 top-4 w-2 h-2 text-[#FFE9A6]" />

        {/* corner ornaments */}
        <Rangoli className="absolute -left-4 -top-4 w-20 h-20 opacity-80" />
        <Rangoli className="absolute -right-4 -bottom-4 w-20 h-20 opacity-80" />

        <div className="relative">
          <div className="text-sm sm:text-base font-semibold tracking-wide text-[#FFD36B]">{copy.blessing}</div>

          <div className="mt-2 flex items-center justify-center gap-3">
            {copy.image ? (
              <img src={copy.image} alt="" className="h-16 sm:h-20 w-auto object-contain shrink-0" />
            ) : (
              <Swastik className="w-7 h-7 shrink-0" />
            )}
            <h3 className="font-heading text-xl sm:text-3xl font-semibold tracking-tight text-[#FFE9A6]">{copy.title}</h3>
            <Diya className="w-10 h-10 shrink-0" />
          </div>

          <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed max-w-xl mx-auto">{copy.subtitle}</p>

          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-black/25 border border-[#FFD36B]/50 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#FFE9A6]">
            {days <= 1 ? "Last day of the offer" : `${days} days left`}
            <span className="opacity-60">·</span>
            <span>{offer.priceLockNote}</span>
          </div>

          {showFreeMonth && (
            <div className="mt-3 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-white">
              <Gift className="w-4 h-4 text-[#FFD36B] shrink-0" strokeWidth={2} />
              <span>Plus: {FREE_MONTH_SHORT}</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-3" aria-hidden="true">
            <Diya className="w-6 h-6" glow={false} /><Diya className="w-6 h-6" /><Diya className="w-6 h-6" glow={false} />
          </div>

        </div>
      </div>
    </div>
  );
}

// Fireworks behind the pricing banner: a canvas animation, see Fireworks.jsx.
export { default as Fireworks } from "@/components/landing/Fireworks";
