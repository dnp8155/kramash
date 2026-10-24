import { renderClassicMinimal } from "@/components/quotation/templates/classicMinimalTemplate";
import { renderModernStyle } from "@/components/quotation/templates/modernStyleTemplate";
import { renderCustom } from "@/components/quotation/templates/customTemplate";
import { foldAdjustmentIntoSubtotal, impliedAdjustment } from "@/lib/quotationCalc";
import { itemsForClientPdf, teamRolesForPdf } from "@/lib/quotationClientView";

// Quotation PDF template registry.
// Each template has: id, name, description, render(data) -> HTML string.
// To add a new template, create a render function and add it here.
export const QUOTATION_TEMPLATES = [
  {
    id: "black_premium",
    name: "Modern Style",
    description: "Editorial layout with a hero picture, soft cards, milestone timeline and a premium totals panel — up to 3 pictures",
    supportsImages: true,
    modern: true,
    render: renderModernStyle
  },
  {
    id: "classic_minimal",
    name: "Classic Minimal",
    description: "Simple black & white day-wise layout with client details, team lists and pricing",
    render: renderClassicMinimal
  },
  {
    id: "custom",
    name: "Custom",
    description: "Build your own layout from blocks — cover, text, lists, pictures, tables, pricing and more",
    supportsImages: true,
    builder: true,
    render: renderCustom
  }
];

export function getTemplate(id) {
  return QUOTATION_TEMPLATES.find((t) => t.id === id) || QUOTATION_TEMPLATES[0];
}

// Every PDF / preview goes through here, so client-facing rules apply everywhere:
//  • team rows show the ROLE, never the member's name ("Hide team names" collapses to "N × Role")
//  • the round-off / adjustment (our margin) is folded into Subtotal, never shown as a line
export function renderTemplate(id, data) {
  const tpl = getTemplate(id);
  const q = data.quotation || {};
  const items = data.items || [];
  const alreadyGrouped = items.some((it) => it._grouped);
  const pdfItems = teamRolesForPdf(q.hide_team_names && !alreadyGrouped ? itemsForClientPdf(items, true) : items);
  const folded = foldAdjustmentIntoSubtotal({ subtotal: q.subtotal, adjustmentAmount: impliedAdjustment(q), discountType: q.discount_type });
  return tpl.render({
    ...data,
    items: pdfItems,
    quotation: { ...q, subtotal: folded.subtotal, adjustment_amount: 0, discount_type: folded.discountType },
  });
}