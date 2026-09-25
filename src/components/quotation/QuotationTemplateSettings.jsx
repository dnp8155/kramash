import { Section } from "@/components/quotation/QuotationParts";
import { Switch } from "@/components/ui/switch";

const SECTION_TOGGLES = [
  { key: "projectSummary", label: "Project Summary" },
  { key: "notes", label: "Special Notes" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "payment", label: "Payment Method" },
  { key: "bank", label: "Bank Details" },
  { key: "social", label: "Social Links" },
  { key: "footer", label: "Footer Message" }
];

export default function QuotationTemplateSettings({ templateConfig, onChange, readOnly }) {
  const cfg = templateConfig || {};
  const sections = cfg.sections || {};

  const toggleSection = (key, value) => {
    onChange({ ...cfg, sections: { ...sections, [key]: value } });
  };

  return (
    <Section title="Template Settings">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Sections to Show</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTION_TOGGLES.map((s) => (
            <div key={s.key} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-xs font-medium">{s.label}</span>
              <Switch checked={sections[s.key] !== false} onCheckedChange={(v) => toggleSection(s.key, v)} disabled={readOnly} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Bank Details, Social Links, Footer Message, Terms &amp; Conditions and Payment Conditions content comes from the sections above — these toggles only control whether that section appears on this template.
        </p>
      </div>
    </Section>
  );
}