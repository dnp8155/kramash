import React from "react";
import { ArrowRight, Gift } from "lucide-react";
import { getActiveLaunchOffer, isFreeMonthNoteVisible } from "@/constants/launchOffer";
import { Diya } from "@/components/landing/FestiveOffer";

// Slim announcement strip at the very top of the landing page so the live offer is seen first.
// Reads the same config as the pricing section and disappears by itself when the offer ends.
export default function OfferBar() {
  const offer = getActiveLaunchOffer();
  if (!offer) return null;

  const { copy, offerPrices, daysLeft } = offer;
  const from = offerPrices?.MONTHLY;
  const goPricing = (e) => {
    e.preventDefault();
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <a
      href="#pricing"
      onClick={goPricing}
      className="group block bg-gradient-to-r from-[#1A1A1A] via-[#2A2118] to-[#1A1A1A] text-white"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex items-center justify-center gap-x-3 gap-y-1 flex-wrap text-center">
        <Diya className="w-4 h-4 shrink-0 hidden sm:block" />
        <span className="text-xs sm:text-[13px] font-semibold text-[#E8D5A3]">{copy.ribbon}</span>
        <span className="text-xs sm:text-[13px] text-white/85">
          {from ? <>Pro from <strong className="font-semibold text-white">₹{from}/mo</strong></> : "Launch prices on Pro"}
          <span className="mx-2 text-white/30">·</span>
          {daysLeft <= 30 ? <><strong className="font-semibold text-white">{daysLeft}</strong> day{daysLeft === 1 ? "" : "s"} left</> : "Limited time"}
        </span>
        {isFreeMonthNoteVisible() && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-white/85">
            <Gift className="w-3.5 h-3.5 text-[#C8A95E]" /> 1st month of Pro free for early users
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs sm:text-[13px] font-semibold text-[#C8A95E] group-hover:text-[#E8D5A3] transition-colors">
          See offer <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}
