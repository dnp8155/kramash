import { Section } from "@/components/quotation/QuotationParts";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/hooks/useT";
import { getTemplate } from "@/constants/quotationTemplates";
import ImageLinksEditor from "@/components/quotation/ImageLinksEditor";
import CustomTemplateBuilder from "@/components/quotation/CustomTemplateBuilder";
import { MODERN_DEFAULT_ACCENT } from "@/components/quotation/templates/modernStyleTemplate";
import { Image as ImageIcon } from "lucide-react";

// Keys match the `visibility` the PDF templates and the client link already read, so these switches
// and each section's own "Show in PDF / Show in Link" toggles are one and the same setting.
const SECTION_TOGGLES = [
  { key: "project_summary", label: "Project Summary" },
  { key: "special_notes", label: "Special Notes" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "payment_method", label: "Payment Method" },
  { key: "bank", label: "Bank Details" },
  { key: "social", label: "Social Links" },
  { key: "footer", label: "Footer Message" }
];

const MODERN_SWATCHES = [
  ["#b08d57", "Champagne"], ["#b85a4e", "Terracotta"], ["#1f6f6b", "Teal"],
  ["#1f3a5f", "Navy"], ["#a65d6e", "Rose"], ["#333333", "Charcoal"],
];

// Modern Style: accent colour, and up to 3 pictures. Only the web link is saved — nothing is uploaded.
function TemplateImages({ templateConfig, onChange, readOnly, modern }) {
  const t = useT();
  const accent = templateConfig.accent || MODERN_DEFAULT_ACCENT;
  return (
    <div className="pt-3 mt-3 border-t border-border">
      {modern && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("Accent colour")}</label>
          <div className="flex items-center gap-2 flex-wrap">
            {MODERN_SWATCHES.map(([hex, name]) => (
              <button key={hex} type="button" title={name} disabled={readOnly} onClick={() => onChange({ ...templateConfig, accent: hex })}
                className={`h-7 w-7 rounded-full border-2 transition-all ${accent.toLowerCase() === hex ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: hex }} aria-label={name} />
            ))}
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : MODERN_DEFAULT_ACCENT} onChange={(e) => onChange({ ...templateConfig, accent: e.target.value })} disabled={readOnly} className="h-7 w-9 rounded border border-border bg-card p-0.5 cursor-pointer" aria-label={t("Pick any colour")} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">{t("Used for lines, numbers and highlights. The first picture becomes the large cover image at the top; the others sit under the project statement.")}</p>
        </div>
      )}
      <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" /> {t("Pictures in the PDF (up to 3)")}
      </label>
      <ImageLinksEditor images={templateConfig.images} onChange={(images) => onChange({ ...templateConfig, images })} readOnly={readOnly} />
    </div>
  );
}

export default function QuotationTemplateSettings({ templateConfig, onChange, readOnly, templateId, visibility = {}, setVisibility }) {
  const t = useT();
  const cfg = templateConfig || {};

  const isShown = (key) => visibility?.[key]?.pdf !== false;
  const toggleSection = (key, value) => {
    // Hiding a section removes it from the PDF and from the client's link.
    setVisibility?.({ ...visibility, [key]: { ...(visibility?.[key] || {}), pdf: value, link: value } });
  };

  const tpl = getTemplate(templateId);
  // The Custom template is composed block by block, so the fixed "sections to show" switches don't apply to it.
  if (tpl.builder) {
    return (
      <Section collapsible title={t("Custom Template")}>
        <CustomTemplateBuilder templateConfig={cfg} onChange={onChange} readOnly={readOnly} />
      </Section>
    );
  }

  return (
    <Section collapsible title={t("Template Settings")}>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">{t("Sections to Show")}</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTION_TOGGLES.map((s) => (
            <div key={s.key} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-xs font-medium">{t(s.label)}</span>
              <Switch checked={isShown(s.key)} onCheckedChange={(v) => toggleSection(s.key, v)} disabled={readOnly} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("Bank Details, Social Links, Footer Message, Terms & Conditions and Payment Conditions content comes from the sections above — these toggles only control whether that section appears on this template.")}
        </p>
      </div>
      {tpl.supportsImages && <TemplateImages templateConfig={cfg} onChange={onChange} readOnly={readOnly} modern={!!tpl.modern} />}
    </Section>
  );
}