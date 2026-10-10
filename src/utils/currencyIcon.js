import { IndianRupee, DollarSign, Euro, PoundSterling, Coins } from "lucide-react";

const CURRENCY_ICONS = {
  INR: IndianRupee,
  USD: DollarSign,
  SGD: DollarSign,
  AUD: DollarSign,
  CAD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling
};

// Lucide icon matching the workspace currency (₹ → IndianRupee, $ → DollarSign, …).
export function currencyIcon(currency = "INR") {
  return CURRENCY_ICONS[currency] || Coins;
}
