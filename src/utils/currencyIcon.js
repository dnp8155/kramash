import { createElement } from "react";
import { IndianRupee, DollarSign, Euro, Coins } from "lucide-react";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { cn } from "@/lib/utils";

// The currencies Preferences offers (INR, USD, EUR, AED). The first three have a proper icon in the icon set.
const CURRENCY_ICONS = { INR: IndianRupee, USD: DollarSign, EUR: Euro };
// AED has no icon, so it is drawn as text, written the way Preferences shows it.
const BADGE_SYMBOLS = { AED: "د.إ" };

// For a currency with no icon of its own (AED, or one added later): a small badge that draws its symbol as text,
// sized like an icon (it follows the w-/h- classes the icon slot already passes).
const badgeCache = {};
function symbolBadge(symbol) {
  if (!badgeCache[symbol]) {
    const Badge = ({ className, ...rest }) => createElement(
      "span",
      {
        "aria-hidden": "true",
        className: cn("inline-flex items-center justify-center font-bold leading-none tracking-tight select-none", symbol.length <= 2 ? "text-[12px]" : "text-[11px]", className),
        ...rest,
      },
      symbol
    );
    Badge.displayName = `CurrencySymbol(${symbol})`;
    badgeCache[symbol] = Badge;
  }
  return badgeCache[symbol];
}

// Icon for the workspace currency, in three steps: its own icon (₹ → IndianRupee, $ → DollarSign, € → Euro), else a
// badge with its symbol (AED, or an older workspace's £ / S$ …), else a generic coins icon for an unknown code.
export function currencyIcon(currency = "INR") {
  if (CURRENCY_ICONS[currency]) return CURRENCY_ICONS[currency];
  const symbol = BADGE_SYMBOLS[currency] || CURRENCY_SYMBOLS[currency] || (currency && currency.length <= 4 ? currency : "");
  return symbol ? symbolBadge(symbol) : Coins;
}
