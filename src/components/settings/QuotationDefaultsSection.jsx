import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { Loader2, Save, FileText, CreditCard, Image as ImageIcon } from "lucide-react";

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
        showLogoOnQuotation: parsed.showLogoOnQuotation ?? true,
        showLogoWatermark: parsed.showLogoWatermark ?? true,
      });
    } catch {
      setPrefs({ defaultTerms: "", defaultPaymentMethod: "", defaultPaymentInstructions: "", showLogoOnQuotation: true, showLogoWatermark: true });
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
        </div>
        <p className="text-xs text-muted-foreground mt-2">Used as the starting payment info for new quotations. Can be overridden per quotation.</p>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Defaults</>}
      </Button>
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