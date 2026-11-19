// The Custom quotation template: a list of blocks plus a theme and a letterhead, all stored as plain JSON
// in the quotation's template settings (templateConfig.custom). Used by the builder UI, the presets and the renderer.

export const CUSTOM_FONTS = {
  clean: { label: "Clean (Arial)", css: "Arial, Helvetica, sans-serif", link: "" },
  classic: { label: "Classic (Georgia)", css: "Georgia, 'Times New Roman', serif", link: "" },
  modern: {
    label: "Modern (Poppins)",
    css: "'Poppins', Arial, Helvetica, sans-serif",
    link: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
    families: "Poppins:300,400,500,600,700",
  },
};

export const HEADING_STYLES = { bar: "Coloured bar", underline: "Underline", plain: "Plain" };
export const HEADER_LAYOUTS = { block: "Logo block (like a studio letterhead)", left: "Logo left, name beside it", center: "Centred" };
export const FOOTER_LAYOUTS = { columns: "Three columns", center: "Centred", none: "No footer" };

export const DEFAULT_THEME = { accent: "#b85a4e", font: "clean", headingStyle: "bar" };

export const DEFAULT_LETTERHEAD = {
  enabled: true,
  headerLayout: "block",
  footerLayout: "columns",
  // Lines that aren't in the business profile — partner names, a second phone number, a registration no.
  extra: [],
  footerTagline: "",
};

// type -> label, what its heading is called by default, and the props a new block starts with.
export const BLOCK_TYPES = {
  cover: {
    label: "Cover page", group: "Page",
    defaults: () => ({ title: "PROJECT PROPOSAL", subtitle: "", forLabel: "FOR", location: "", showOutline: true, tags: "" }),
  },
  details: {
    label: "Client & quotation details", group: "Content", heading: "",
    defaults: () => ({ heading: "" }),
  },
  text: {
    label: "Heading + text", group: "Content", heading: "About",
    defaults: () => ({ heading: "About", body: "<p>Write here. You can use {{client}}, {{business}}, {{date}} and {{number}}.</p>" }),
  },
  list: {
    label: "Bullet / tick list", group: "Content", heading: "Scope of work",
    defaults: () => ({ heading: "Scope of work", style: "check", boldLead: true, items: "First point: what it covers\nSecond point: what it covers" }),
  },
  stats: {
    label: "Key facts", group: "Content", heading: "Key facts",
    defaults: () => ({ heading: "Key facts", rows: [{ label: "Plot area", value: "", note: "" }] }),
  },
  images: {
    label: "Pictures (up to 3)", group: "Content", heading: "",
    defaults: () => ({ heading: "", images: [{ url: "", caption: "" }] }),
  },
  table: {
    label: "Table", group: "Content", heading: "Timeline",
    defaults: () => ({ heading: "Timeline", columns: ["Phase", "Task", "Priority"], rows: [["Stage 1", "", ""]] }),
  },
  callout: {
    label: "Highlighted note / quote", group: "Content", heading: "",
    defaults: () => ({ text: "Write a short note or quote here.", style: "quote" }),
  },
  pricing: {
    label: "Pricing (items & totals)", group: "From the quotation", heading: "Professional Charges",
    defaults: () => ({ heading: "Professional Charges", showItems: true, showTotals: true }),
  },
  milestones: {
    label: "Payment milestones", group: "From the quotation", heading: "Payment Milestones",
    defaults: () => ({ heading: "Payment Milestones" }),
  },
  terms: {
    label: "Terms & notes", group: "From the quotation", heading: "General Terms",
    defaults: () => ({ heading: "General Terms", source: "terms" }),
  },
  bank: {
    label: "Bank details", group: "From the quotation", heading: "Bank Details",
    defaults: () => ({ heading: "Bank Details" }),
  },
  social: {
    label: "Social links", group: "From the quotation", heading: "",
    defaults: () => ({ heading: "" }),
  },
  signoff: {
    label: "Closing & sign-off", group: "Page", heading: "",
    defaults: () => ({ text: "We hope this proposal meets your expectations. Please let us know if you have any questions.", regards: "Best Regards,", name: "", role: "" }),
  },
  pagebreak: {
    label: "Start a new page", group: "Page", heading: "",
    defaults: () => ({}),
  },
};

// Sources for the "Terms & notes" block.
export const TERMS_SOURCES = {
  terms: { label: "Terms & conditions", heading: "General Terms", key: "terms" },
  payment_conditions: { label: "Payment conditions", heading: "Payment Conditions", key: "payment_conditions" },
  special_notes: { label: "Special notes", heading: "Special Notes", key: "special_notes" },
};

let counter = 0;
export function newBlockId() {
  counter += 1;
  return `b${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 5)}`;
}

export function newBlock(type) {
  const meta = BLOCK_TYPES[type];
  if (!meta) return null;
  return { id: newBlockId(), type, ...meta.defaults() };
}

// The heading shown for a block (its own text, or the type's default for headings that may be left blank).
export function blockHeading(block) {
  if (!block) return "";
  if (block.type === "terms") return String(block.heading ?? TERMS_SOURCES[block.source]?.heading ?? "").trim();
  return String(block.heading ?? "").trim();
}

// Blocks that appear in the cover page's outline.
const OUTLINE_TYPES = new Set(["text", "list", "stats", "table", "pricing", "milestones", "terms", "bank", "images"]);
export function outlineTitles(blocks) {
  return (blocks || []).filter((b) => OUTLINE_TYPES.has(b.type) && b.outline !== false && blockHeading(b)).map(blockHeading);
}

// Fills in anything missing so the renderer and the builder never have to guard against undefined.
export function normalizeCustom(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  const blocks = (Array.isArray(c.blocks) ? c.blocks : []).filter((b) => b && BLOCK_TYPES[b.type]).map((b) => ({ id: b.id || newBlockId(), ...BLOCK_TYPES[b.type].defaults(), ...b }));
  return {
    theme: { ...DEFAULT_THEME, ...(c.theme || {}) },
    letterhead: { ...DEFAULT_LETTERHEAD, ...(c.letterhead || {}), extra: Array.isArray(c.letterhead?.extra) ? c.letterhead.extra : [] },
    blocks,
  };
}
