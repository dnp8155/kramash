import { renderGoldPremium } from "@/components/quotation/templates/goldPremiumTemplate";

// Quotation PDF template registry.
// Each template has: id, name, description, render(data) -> HTML string.
// To add a new template, create a render function and add it here.
export const QUOTATION_TEMPLATES = [
  {
    id: "gold_premium",
    name: "Gold Premium",
    description: "Black & gold luxury layout with project summary box",
    render: renderGoldPremium
  }
];

export function getTemplate(id) {
  return QUOTATION_TEMPLATES.find((t) => t.id === id) || QUOTATION_TEMPLATES[0];
}

export function renderTemplate(id, data) {
  const tpl = getTemplate(id);
  return tpl.render(data);
}