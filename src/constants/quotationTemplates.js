import { renderGoldPremium } from "@/components/quotation/templates/goldPremiumTemplate";
import { renderNavyGold } from "@/components/quotation/templates/navyGoldTemplate";
import { renderClassicMinimal } from "@/components/quotation/templates/classicMinimalTemplate";
import { renderBlackPremium } from "@/components/quotation/templates/blackPremiumTemplate";

// Quotation PDF template registry.
// Each template has: id, name, description, render(data) -> HTML string.
// To add a new template, create a render function and add it here.
export const QUOTATION_TEMPLATES = [
  {
    id: "black_premium",
    name: "Black Premium",
    description: "Black & white luxury layout with project summary box",
    render: renderBlackPremium
  },
  {
    id: "gold_premium",
    name: "Gold Premium",
    description: "Black & gold luxury layout with project summary box",
    render: renderGoldPremium
  },
  {
    id: "navy_gold",
    name: "Navy Gold",
    description: "Professional navy & gold corporate quotation with bank details",
    render: renderNavyGold
  },
  {
    id: "classic_minimal",
    name: "Classic Minimal",
    description: "Simple black & white day-wise layout with client details, team lists and pricing",
    render: renderClassicMinimal
  }
];

export function getTemplate(id) {
  return QUOTATION_TEMPLATES.find((t) => t.id === id) || QUOTATION_TEMPLATES[0];
}

export function renderTemplate(id, data) {
  const tpl = getTemplate(id);
  return tpl.render(data);
}