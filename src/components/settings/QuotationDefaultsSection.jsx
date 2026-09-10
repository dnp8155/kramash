import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { Loader2, Save, FileText, CreditCard, Image as ImageIcon, Building2, Share2, Instagram, Youtube, Globe, Link as LinkIcon } from "lucide-react";

export default function QuotationDefaultsSection() {
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const parsed = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : {};
      setPrefs({
        defaultTerms: parsed.defaultTerms || "",
        defaultPaymentMethod: parsed.defaultPaymentMethod || "",
        defaultPaymentInstructions: parsed.defaultPaymentInstructions || "",
        defaultPaymentConditions: parsed.defaultPaymentConditions || "",
        showLogoOnQuotation: parsed.showLogoOnQuotation ?? true,
        showLogoWatermark: parsed.showLogoWatermark ?? true,
        // Bank
        bank_account_name: parsed.bank_account_name || "",
        bank_name: parsed.bank_name || "",
        bank_account_number: parsed.bank_account_number || "",
        bank_ifsc: parsed.bank_ifsc || "",
        bank_upi_id: parsed.bank_upi_id || "",
        // Social
        social_instagram: parsed.social_instagram || "",
        social_youtube: parsed.social_youtube || "",
        social_website: parsed.social_website || "",
        social_portfolio: parsed.social_portfolio || "",
      });
    } catch {
      setPrefs({
        defaultTerms: "", defaultPaymentMethod: "", defaultPaymentInstructions: "",
        defaultPaymentConditions: "", showLogoOnQuotation: true, showLogoWatermark: true,
        bank_account_name: "", bank_name: "", bank_account_number: "", bank_ifsc: "", bank_upi_id: "",
        social_instagram: "", social_youtube: "", social_website: "", social_portfolio: "",
      });
    }
  }, [workspace]);

  const set = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const existing = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : {};
      const updated = { ...existing, ...prefs };
      await base44.entities.Workspace.update(workspace.id, { display_preferences: JSON.stringify(updated) });
      setWorkspace((w) => ({ ...w, display_preferences: JSON.stringify(updated) }));
      toast({ title: "Quotation defaults saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const hasLogo = !!workspace?.logo;

  return (
    <div className="space-y-4">
      {/* Logo settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Quotation Logo</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {hasLogo ? "Uses your workspace logo (set in Workspace tab)." : "No logo uploaded — add one in the Workspace tab first."}
        </p>
        <div className="space-y-3">
          <ToggleRow
            label="Show logo on quotation"
            hint="Display workspace logo in the quotation header"
            checked={prefs.showLogoOnQuotation}
            onChange={(v) => set("showLogoOnQuotation", v)}
          />
          <ToggleRow
            label="Logo watermark (letterhead style)"
            hint="Large, light-opacity logo centered behind the quotation content"
            checked={prefs.showLogoWatermark}
            onChange={(v) => set("showLogoWatermark", v)}
          />
        </div>
      </div>

      {/* T&C */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Default Terms & Conditions</h3>
        </div>
        <Textarea
          value={prefs.defaultTerms}
          onChange={(e) => set("defaultTerms", e.target.value)}
          rows={5}
          placeholder="Enter default terms & conditions for all quotations…"
        />
        <p className="text-xs text-muted-foreground mt-2">Used as the starting T&C for new quotations. Can be overridden per quotation.</p>
      </div>

      {/* Payment */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Default Payment Details</h3>
        </div>
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
            <Input value={prefs.defaultPaymentMethod} onChange={(e) => set("defaultPaymentMethod", e.target.value)} placeholder="e.g. Bank Transfer / UPI / Cheque" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Instructions</label>
            <Textarea value={prefs.defaultPaymentInstructions} onChange={(e) => set("defaultPaymentInstructions", e.target.value)} rows={3} placeholder="Payment details will be shared upon confirmation." />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Conditions</label>
            <Textarea value={prefs.defaultPaymentConditions} onChange={(e) => set("defaultPaymentConditions", e.target.value)} rows={4} placeholder="e.g. 50% advance to confirm booking. Balance due on or before event day. Payments once made are non-refundable." />
            <p className="text-xs text-muted-foreground mt-1">Shown as a separate section on the quotation PDF.</p>
          </div>
        </div>
      </div>

      {/* Bank & UPI Details */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Default Bank & UPI Details</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Pre-filled for new quotations. Can be overridden per quotation.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Account Name</label>
            <Input value={prefs.bank_account_name} onChange={(e) => set("bank_account_name", e.target.value)} placeholder="Account holder name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Bank Name</label>
            <Input value={prefs.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="e.g. State Bank of India" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Account Number</label>
            <Input value={prefs.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} placeholder="0000 0000 0000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">IFSC</label>
            <Input value={prefs.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value)} placeholder="e.g. SBIN0001234" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">UPI ID</label>
            <Input value={prefs.bank_upi_id} onChange={(e) => set("bank_upi_id", e.target.value)} placeholder="e.g. name@oksbi" />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Default Social Links</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Only non-empty links will be shown on the quotation. Icons auto-detect from the URL.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SocialField label="Instagram" value={prefs.social_instagram} onChange={(v) => set("social_instagram", v)} placeholder="https://instagram.com/…" Icon={Instagram} />
          <SocialField label="YouTube" value={prefs.social_youtube} onChange={(v) => set("social_youtube", v)} placeholder="https://youtube.com/…" Icon={Youtube} />
          <SocialField label="Website" value={prefs.social_website} onChange={(v) => set("social_website", v)} placeholder="https://…" Icon={Globe} />
          <SocialField label="Portfolio" value={prefs.social_portfolio} onChange={(v) => set("social_portfolio", v)} placeholder="https://…" Icon={LinkIcon} />
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Defaults</>}
      </Button>
    </div>
  );
}

function SocialField({ label, value, onChange, placeholder, Icon }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm text-foreground block">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}