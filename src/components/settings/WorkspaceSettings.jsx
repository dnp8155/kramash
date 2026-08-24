import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import { Upload, Loader2 } from "lucide-react";
import { businessTypes } from "@/constants/preferencesConfig";
import { toast } from "@/components/ui/use-toast";

const currencies = [{ v: "INR", l: "INR (₹)" }, { v: "USD", l: "USD ($)" }, { v: "EUR", l: "EUR (€)" }, { v: "AED", l: "AED (د.إ)" }];
const timezones = ["Asia/Kolkata", "UTC", "Asia/Dubai", "America/New_York"];
const gstRates = [0, 5, 12, 18, 28];

export default function WorkspaceSettings() {
  const { user } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (workspace) {
      setForm({
        name: workspace.name || "",
        business_type: workspace.business_type || "Photography",
        phone: workspace.phone || "",
        email: workspace.email || user?.email || "",
        address: workspace.address || "",
        city: workspace.city || "",
        state: workspace.state || "",
        country: workspace.country || "India",
        currency: workspace.currency || "INR",
        timezone: workspace.timezone || "Asia/Kolkata",
        gst_enabled: !!workspace.gst_enabled,
        gstin: workspace.gstin || "",
        gst_business_name: workspace.gst_business_name || "",
        gst_billing_address: workspace.gst_billing_address || "",
        gst_state: workspace.gst_state || "",
        default_gst_rate: workspace.default_gst_rate ?? 18,
        logo: workspace.logo || ""
      });
    }
  }, [workspace, user?.email]);

  if (!form) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please choose an image file." }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large (max 5MB)." }); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo", file_url);
      await base44.entities.Workspace.update(workspace.id, { logo: file_url });
      setWorkspace((w) => ({ ...w, logo: file_url }));
      toast({ title: "Logo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Workspace.update(workspace.id, {
        name: form.name,
        business_type: form.business_type,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        currency: form.currency,
        timezone: form.timezone,
        gst_enabled: form.gst_enabled,
        gstin: form.gstin,
        gst_business_name: form.gst_business_name,
        gst_billing_address: form.gst_billing_address,
        gst_state: form.gst_state,
        default_gst_rate: form.default_gst_rate
      });
      setWorkspace(updated);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">Owner & Workspace</h3>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
          {form.logo
            ? <img src={form.logo} alt="Workspace logo" className="w-full h-full object-cover" />
            : <Upload className="w-5 h-5 text-muted-foreground" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : form.logo ? "Replace" : "Upload"}
          </Button>
          {form.logo && (
            <Button variant="ghost" size="sm" onClick={async () => {
              try {
                await base44.entities.Workspace.update(workspace.id, { logo: "" });
                set("logo", "");
                setWorkspace((w) => ({ ...w, logo: "" }));
                toast({ title: "Logo removed" });
              } catch (err) {
                toast({ title: "Failed to remove logo", description: err.message, variant: "destructive" });
              }
            }}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Field label="Owner Name"><Input value={user?.full_name || ""} disabled placeholder="Owner name" /></Field>
        <Field label="Business / Workspace Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Business Type">
          <Select value={form.business_type} onChange={(e) => set("business_type", e.target.value)}>
            {businessTypes.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Business Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91…" /></Field>
          <Field label="Business Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <Field label="Business Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
          <Field label="Currency">
            <Select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              {currencies.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Timezone">
          <Select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {timezones.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>

        {/* GST */}
        <div className="pt-3 mt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-foreground">GST Registration</span>
            <Toggle checked={form.gst_enabled} onChange={(v) => set("gst_enabled", v)} label="GST enabled" />
          </div>
          {form.gst_enabled && (
            <div className="space-y-3 mt-3 animate-fade-in">
              <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" /></Field>
              <Field label="Registered Business Name"><Input value={form.gst_business_name} onChange={(e) => set("gst_business_name", e.target.value)} /></Field>
              <Field label="GST Billing Address"><Input value={form.gst_billing_address} onChange={(e) => set("gst_billing_address", e.target.value)} /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="GST State"><Input value={form.gst_state} onChange={(e) => set("gst_state", e.target.value)} /></Field>
                <Field label="Default GST Rate (%)">
                  <Select value={form.default_gst_rate} onChange={(e) => set("default_gst_rate", Number(e.target.value))}>
                    {gstRates.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          )}
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, className, children }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}