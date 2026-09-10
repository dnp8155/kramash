import { Section, Field } from "@/components/quotation/QuotationParts";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import Button from "@/components/common/Button";

const SECTION_TOGGLES = [
  { key: "projectSummary", label: "Project Summary" },
  { key: "notes", label: "Notes" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "payment", label: "Payment Method" },
  { key: "bank", label: "Bank Details" },
  { key: "social", label: "Social Links" },
  { key: "footer", label: "Footer Message" }
];

export default function QuotationTemplateSettings({ templateConfig, onChange, readOnly }) {
  const cfg = templateConfig || {};
  const sections = cfg.sections || {};

  const updateSection = (path, value) => {
    const [section, key] = path.split(".");
    onChange({ ...cfg, [section]: { ...(cfg[section] || {}), [key]: value } });
  };

  const toggleSection = (key, value) => {
    onChange({ ...cfg, sections: { ...sections, [key]: value } });
  };

  const updateSocialLink = (index, field, value) => {
    const links = [...(cfg.socialLinks || [])];
    links[index] = { ...links[index], [field]: value };
    onChange({ ...cfg, socialLinks: links });
  };

  const addSocialLink = () => {
    const links = [...(cfg.socialLinks || []), { platform: "", url: "", shortName: "", enabled: true }];
    onChange({ ...cfg, socialLinks: links });
  };

  const removeSocialLink = (index) => {
    onChange({ ...cfg, socialLinks: (cfg.socialLinks || []).filter((_, i) => i !== index) });
  };

  return (
    <Section title="Template Settings">
      {/* Section Toggles */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Sections to Show</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTION_TOGGLES.map((s) => (
            <div key={s.key} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-xs font-medium">{s.label}</span>
              <Switch
                checked={sections[s.key] !== false}
                onCheckedChange={(v) => toggleSection(s.key, v)}
                disabled={readOnly}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Company Overrides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
        <Field label="Company Subtitle">
          <Input value={cfg.company?.subtitle || ""} onChange={(e) => updateSection("company.subtitle", e.target.value)} disabled={readOnly} placeholder="e.g. TECHNOLOGY" />
        </Field>
        <Field label="Company Website">
          <Input value={cfg.company?.website || ""} onChange={(e) => updateSection("company.website", e.target.value)} disabled={readOnly} placeholder="www.example.com" />
        </Field>
        <Field label="Company Tagline" >
          <Input value={cfg.company?.tagline || ""} onChange={(e) => updateSection("company.tagline", e.target.value)} disabled={readOnly} placeholder="Your tagline" />
        </Field>
        <Field label="Quotation Title">
          <Input value={cfg.company?.quotationTitle || ""} onChange={(e) => updateSection("company.quotationTitle", e.target.value)} disabled={readOnly} placeholder="QUOTATION" />
        </Field>
      </div>

      {/* Payment */}
      <div className="pt-2 border-t border-border space-y-3">
        <Field label="Payment Method">
          <Input value={cfg.payment?.method || ""} onChange={(e) => updateSection("payment.method", e.target.value)} disabled={readOnly} placeholder="Bank Transfer / UPI / Cheque" />
        </Field>
        <Field label="Payment Instructions">
          <Textarea value={cfg.payment?.instructions || ""} onChange={(e) => updateSection("payment.instructions", e.target.value)} disabled={readOnly} rows={2} placeholder="Payment details will be shared upon confirmation." />
        </Field>
      </div>

      {/* Bank Details */}
      <div className="pt-2 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Bank Details Enabled</label>
          <Switch
            checked={cfg.bank?.enabled !== false}
            onCheckedChange={(v) => updateSection("bank.enabled", v)}
            disabled={readOnly}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bank Name">
            <Input value={cfg.bank?.bankName || ""} onChange={(e) => updateSection("bank.bankName", e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Account Name">
            <Input value={cfg.bank?.accountName || ""} onChange={(e) => updateSection("bank.accountName", e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Account Number">
            <Input value={cfg.bank?.accountNumber || ""} onChange={(e) => updateSection("bank.accountNumber", e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="IFSC Code">
            <Input value={cfg.bank?.ifsc || ""} onChange={(e) => updateSection("bank.ifsc", e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Branch">
            <Input value={cfg.bank?.branch || ""} onChange={(e) => updateSection("bank.branch", e.target.value)} disabled={readOnly} />
          </Field>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-border space-y-3">
        <Field label="Footer Message Line 1">
          <Input value={cfg.footer?.messageLine1 || ""} onChange={(e) => updateSection("footer.messageLine1", e.target.value)} disabled={readOnly} placeholder="We appreciate the opportunity to work with you." />
        </Field>
        <Field label="Footer Message Line 2">
          <Input value={cfg.footer?.messageLine2 || ""} onChange={(e) => updateSection("footer.messageLine2", e.target.value)} disabled={readOnly} placeholder="Looking forward to building something great together." />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Credit Prefix">
            <Input value={cfg.footer?.creditPrefix || ""} onChange={(e) => updateSection("footer.creditPrefix", e.target.value)} disabled={readOnly} placeholder="developed by" />
          </Field>
          <Field label="Credit Name">
            <Input value={cfg.footer?.creditName || ""} onChange={(e) => updateSection("footer.creditName", e.target.value)} disabled={readOnly} placeholder="DevIgnite" />
          </Field>
        </div>
      </div>

      {/* Social Links */}
      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Social Links</label>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addSocialLink}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        {(cfg.socialLinks || []).map((link, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <Input value={link.shortName || ""} onChange={(e) => updateSocialLink(i, "shortName", e.target.value)} disabled={readOnly} placeholder="f" className="w-14" />
            <Input value={link.platform || ""} onChange={(e) => updateSocialLink(i, "platform", e.target.value)} disabled={readOnly} placeholder="Facebook" className="flex-1" />
            <Input value={link.url || ""} onChange={(e) => updateSocialLink(i, "url", e.target.value)} disabled={readOnly} placeholder="https://..." className="flex-1" />
            <Switch checked={link.enabled !== false} onCheckedChange={(v) => updateSocialLink(i, "enabled", v)} disabled={readOnly} />
            {!readOnly && (
              <button onClick={() => removeSocialLink(i)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {(!cfg.socialLinks || cfg.socialLinks.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-2">No social links added.</p>
        )}
      </div>
    </Section>
  );
}