import { base44 } from "@/api/base44Client";

export const PACKAGE_CATEGORIES = [
  { key: "wedding", label: "Wedding" },
  { key: "pre_wedding", label: "Pre-Wedding" },
  { key: "event", label: "Event" },
  { key: "corporate", label: "Corporate" },
  { key: "portrait", label: "Portrait" },
  { key: "general", label: "General" }
];

export const categoryLabel = (cat) => PACKAGE_CATEGORIES.find((c) => c.key === cat)?.label || cat || "General";

export function parseItems(itemsJson) {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyItems(items) {
  return JSON.stringify(items || []);
}

export function calcPackageTotal(items, discountType, discountValue) {
  const subtotal = (items || []).reduce((sum, item) => {
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.unit_rate) || 0;
    const days = Number(item.days) || 1;
    return sum + qty * rate * days;
  }, 0);
  let discountAmount = 0;
  if (discountType === "percent") {
    discountAmount = (subtotal * (Number(discountValue) || 0)) / 100;
  } else {
    discountAmount = Number(discountValue) || 0;
  }
  discountAmount = Math.min(discountAmount, subtotal);
  return {
    subtotal,
    discount_amount: discountAmount,
    total_price: Math.max(0, subtotal - discountAmount)
  };
}

export async function createPackage(data) {
  return base44.entities.Package.create(data);
}

export async function updatePackage(id, data) {
  return base44.entities.Package.update(id, data);
}

export async function deletePackage(id) {
  return base44.entities.Package.delete(id);
}