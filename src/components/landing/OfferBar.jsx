import React from "react";
import { Gift } from "lucide-react";
import { getActiveLaunchOffer, isFreeMonthNoteVisible } from "@/constants/launchOffer";
import { Diya } from "@/components/landing/FestiveOffer";

// Slim announcement strip at the very top of the landing page so the live offer is seen first.
// Reads the same config as the pricing section and disappears by itself when the offer ends.
// Laid out like the app's update banner (icon + message on the left, bordered action on the right), in the
// offer's own festive colours.
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 text-sm flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 min-w-0">
          <Diya className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            <span className="font-semibold text-[#E8D5A3]">{copy.ribbon}</span>{" "}
            <span className="text-white/80">
              {from ? <>Pro from <strong className="font-semibold text-white">₹{from}/mo</strong></> : "Launch prices on Pro"}
              {" · "}
              {daysLeft <= 30 ? <><strong className="font-semibold text-white">{daysLeft}</strong> day{daysLeft === 1 ? "" : "s"} left</> : "Limited time"}
            </span>
            {isFreeMonthNoteVisible() && (
              <span className="hidden md:inline text-white/80">
                {" · "}<Gift className="inline w-3.5 h-3.5 -mt-0.5 mr-1 text-[#C8A95E]" />1st month of Pro free for early users
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 px-3 py-1 rounded-md border border-[#E8D5A3]/40 bg-white/15 group-hover:bg-white/25 transition-colors font-medium text-[#E8D5A3]">
          See offer
        </span>
      </div>
    </a>
  );
}
