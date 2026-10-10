import { newBlockId, normalizeCustom } from "@/constants/customTemplate";

// Starter layouts for the Custom template. Each build() returns a fresh config (new block ids) to copy into the
// quotation. Wording is generic and meant to be edited; names, dates and money come from the quotation.
const b = (type, props) => ({ id: newBlockId(), type, ...props });

const PRESETS = [
  {
    id: "proposal",
    name: "Design proposal (cover page + letterhead)",
    description: "Cover with outline, intro, key facts, process, timeline, scope lists, charges, milestones, terms and sign-off.",
    build: () => ({
      theme: { accent: "#b85a4e", font: "clean", headingStyle: "bar" },
      letterhead: { enabled: true, headerLayout: "block", footerLayout: "columns", extra: [], footerTagline: "" },
      blocks: [
        b("cover", { title: "PROJECT PROPOSAL", subtitle: "DESIGN & CONSULTANCY", forLabel: "FOR", location: "", showOutline: true, tags: "" }),
        b("text", { heading: "", body: "<p><strong>{{business}}</strong> is a design and consultancy practice. Replace this with a short introduction of your practice — your experience, the kind of work you do and how you approach it.</p>" }),
        b("stats", { heading: "Design Brief", rows: [
          { label: "Total plot area", value: "", note: "" },
          { label: "Approx. built-up area", value: "", note: "" },
          { label: "Approx. carpet area", value: "", note: "" },
          { label: "Open area to be developed", value: "", note: "(for parking, utility and landscaping)" },
        ] }),
        b("text", { heading: "", body: "<p>Describe the project in a few lines — who it is for, what it should achieve and what matters most to the client.</p>" }),
        b("list", { heading: "Design Process", style: "number", boldLead: true, items: "Design inquiry: understanding vision & lifestyle\nLayout finalisation: zoning, flow & space planning\nElevation finalisation: façade and exterior design\nArchitecture detailing: technical specifications & detail drawings\nSite execution: construction starts\nInterior design: after the envelope is built" }),
        b("table", { heading: "Project Timeline", columns: ["Phase", "Task", "Priority"], rows: [
          ["Stage 1", "Layout finalisation\nPassing and approvals", "High / urgent"],
          ["Stage 2", "Elevation design approval", "After layout finalisation"],
          ["Stage 3", "Structure design integration & architecture detail drawings", "Simultaneous to demolition and levelling on site"],
          ["Stage 4", "Execution\nElectrical, plumbing and flooring detail drawings\nInterior design and approvals", "Parallel to civil"],
          ["Stage 5", "Full interior execution", "Final phase"],
        ] }),
        b("list", { heading: "Scope of Work – Architecture", style: "check", boldLead: true, items: "# Architecture design drawings\nSpace planning: alternative options for all floor layouts with basic furniture placement\nElevation and façade design: options for all sides of the building\nCompound wall and gate design\nExterior layout: parking, utility and landscaping\n# Working drawings\nLine-out drawings for site execution\nArchitectural detail drawings integrated with the structural layout\nSections for staircase, toilets and levelling\nDoor and window schedule\n# Site assistance\nProject roadmap between agencies\nSelection of materials, finishes and fixtures\nPeriodic site visits" }),
        b("list", { heading: "Scope of Work – Interior", style: "check", boldLead: true, items: "Interior design with detailing: concept and design for all spaces\nTechnical drawings: furniture layouts and detail drawings for site execution\nProject management: coordination between contractors, vendors and the client\nCuration: selection of materials, finishes and fixtures" }),
        b("pricing", { heading: "Professional Charges", showItems: true, showTotals: true }),
        b("milestones", { heading: "Payment Milestones" }),
        b("terms", { heading: "General Notes", source: "terms" }),
        b("signoff", { text: "We hope this proposal meets your expectations. Please let us know if you have any questions regarding the terms or deliverables outlined above. We look forward to a successful collaboration.", regards: "Best Regards,", name: "", role: "" }),
      ],
    }),
  },
  {
    id: "simple",
    name: "Simple quotation (letterhead + pricing)",
    description: "Client details, pricing, milestones, terms, bank details and sign-off — no cover page.",
    build: () => ({
      theme: { accent: "#1f3a5f", font: "clean", headingStyle: "underline" },
      letterhead: { enabled: true, headerLayout: "left", footerLayout: "center", extra: [], footerTagline: "" },
      blocks: [
        b("details", { heading: "" }),
        b("text", { heading: "Project", body: "<p>{{project}}</p>" }),
        b("pricing", { heading: "Quotation", showItems: true, showTotals: true }),
        b("milestones", { heading: "Payment Milestones" }),
        b("terms", { heading: "Terms & Conditions", source: "terms" }),
        b("bank", { heading: "Bank Details" }),
        b("signoff", { text: "Thank you for the opportunity.", regards: "Regards,", name: "", role: "" }),
      ],
    }),
  },
  {
    id: "blank",
    name: "Blank",
    description: "Start empty and add only the blocks you want.",
    build: () => ({ theme: {}, letterhead: { enabled: true, headerLayout: "left", footerLayout: "center", extra: [], footerTagline: "" }, blocks: [] }),
  },
];

export const CUSTOM_PRESETS = PRESETS;

export function buildPreset(id) {
  const p = PRESETS.find((x) => x.id === id);
  return p ? normalizeCustom(p.build()) : null;
}
