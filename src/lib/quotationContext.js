import { getMemberTypes } from "@/lib/memberTypeService";

// A quotation's "Side / Context" (quotations.context_type). Picked from the workspace's own member types
// (Preferences → Team member types, e.g. Bride Side / Groom Side), plus Common and None, or typed freely.
// It is saved as the text shown. Older quotations saved a fixed key ("bride_side", "residential"…); those
// still read as their label here.
const LEGACY_LABELS = {
  bride_side: "Bride Side",
  groom_side: "Groom Side",
  common: "Common",
  both: "Common",
  other: "Others",
  others: "Others",
  residential: "Residential",
  commercial: "Commercial",
  office: "Office",
  renovation: "Renovation",
  interior: "Interior",
};

export const CONTEXT_NONE = "None";

// The text to show in the editor field: the label for an old key, else what was typed.
export function contextValueLabel(value) {
  const v = String(value || "").trim();
  return LEGACY_LABELS[v] || v;
}

// The text to print on PDFs and links: same as above, but nothing for an empty value or "None".
export function contextDisplay(value) {
  const label = contextValueLabel(value);
  return label.toLowerCase() === CONTEXT_NONE.toLowerCase() ? "" : label;
}

// Suggestions for the field: the member types from Preferences, Common, None, and anything used before.
export function contextSuggestions(workspace, used = []) {
  return [
    ...getMemberTypes(workspace).map((t) => t.title),
    "Common",
    CONTEXT_NONE,
    ...used.map(contextValueLabel),
  ].filter(Boolean);
}
