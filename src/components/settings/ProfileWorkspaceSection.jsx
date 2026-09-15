import { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import ChangePasswordDialog from "@/components/settings/ChangePasswordDialog";
import { Pencil, Check, Loader2, Upload, User, Building2, Lock, KeyRound, Globe, Copy, ExternalLink } from "lucide-react";
import { isValidIndianPhone, isValidEmail } from "@/lib/validation";

const currencies = [{ v: "INR", l: "INR (₹)" }, { v: "USD", l: "USD ($)" }, { v: "EUR", l: "EUR (€)" }, { v: "AED", l: "AED (د.إ)" }];
const timezones = ["Asia/Kolkata", "UTC", "Asia/Dubai", "America/New_York", "Europe/London", "Australia/Sydney"];
const gstRates = [0, 5, 12, 18, 28];
const dateFormats = [
  { v: "DD/MM/YYYY", l: "DD/MM/YYYY (31/12/2026)" },
  { v: "MM/DD/YYYY", l: "MM/DD/YYYY (12/31/2026)" },
  { v: "YYYY-MM-DD", l: "YYYY-MM-DD (2026-12-31)" },
];
const numberFormats = [
  { v: "indian", l: "Indian (1,00,000)" },
  { v: "western", l: "International (100,000)" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function ProfileWorkspaceSection() {
  const { user, checkUserAuth } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [copiedSlug, setCopiedSlug] = useState(false);

  // ---- Profile state ----
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [savingName, setSavingName] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  // ---- Workspace state ----
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoFileRef = useRef(null);

  // Lock flags — fields are locked once they have a value
  const isNameLocked = !!(user?.full_name?.trim());
  const isBusinessTypeLocked = !!(workspace?.business_type);
  const isPhoneLocked = !!(workspace?.phone);
  const isEmailLocked = !!(workspace?.email);

  // Initialize workspace form when workspace loads
  if (!form && workspace) {
    setForm({
      name: workspace.name || "",
      tagline: workspace.tagline || "",
      website: workspace.website || "",
      phone: workspace.phone || "",
      email: workspace.email || user?.email || "",
      address: workspace.address || "",
      city: workspace.city || "",
      state: workspace.state || "",
      country: workspace.country || "India",
      currency: workspace.currency || "INR",
      timezone: workspace.timezone || "Asia/Kolkata",
      date_format: workspace.date_format || "DD/MM/YYYY",
      number_format: workspace.number_format || "indian",
      fy_start_month: workspace.fy_start_month ?? 4,
      gst_enabled: !!workspace.gst_enabled,
      gstin: workspace.gstin || "",
      gst_business_name: workspace.gst_business_name || "",
      gst_billing_address: workspace.gst_billing_address || "",
      gst_state: workspace.gst_state || "",
      default_gst_rate: workspace.default_gst_rate ?? 18,
      logo: workspace.logo || "",
      public_profile_enabled: !!workspace.public_profile_enabled,
      public_profile_slug: workspace.public_profile_slug || slugify(workspace.name) || ""
    });
  }

  // ---- Profile handlers ----
  const saveName = async () => {
    if (!name.trim()) { toast({ title: "Name cannot be empty." }); return; }
    setSavingName(true);
    try {
      await base44.auth.updateMe({ full_name: name.trim() });
      await checkUserAuth();
      setEditingName(false);
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  // ---- Workspace handlers ----
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

  const saveWorkspace = async () => {
    if (form.phone && !isValidIndianPhone(form.phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid Indian phone number (10 digits, starts with 6-9).", variant: "destructive" });
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updated = await base44.entities.Workspace.update(workspace.id, {
        name: form.name,
        tagline: form.tagline,
        website: form.website,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        currency: form.currency,
        timezone: form.timezone,
        date_format: form.date_format,
        number_format: form.number_format,
        fy_start_month: form.fy_start_month,
        gst_enabled: form.gst_enabled,
        gstin: form.gstin,
        gst_business_name: form.gst_business_name,
        gst_billing_address: form.gst_billing_address,
        gst_state: form.gst_state,
        default_gst_rate: form.default_gst_rate,
        public_profile_enabled: form.public_profile_enabled,
        public_profile_slug: form.public_profile_slug || slugify(form.name)
      });
      setWorkspace(updated);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div className="space-y-4">
      {/* ---- Owner Profile ---- */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Owner Profile</h3>
        </div>

        <div className="space-y-0">
          {/* Full Name — locked once set */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Full Name</span>
            {isNameLocked ? (
              <div className="flex items-center gap-1.5 ml-3">
                <span className="text-sm text-foreground truncate">{user?.full_name}</span>
                <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
              </div>
            ) : editingName ? (
              <div className="flex items-center gap-2 ml-3 flex-1 justify-end">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="flex-1 max-w-[180px] h-8 px-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors shrink-0"
                  aria-label="Save name"
                  title="Save"
                >
                  {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setName(user?.full_name || ""); setEditingName(false); }}
                  className="w-8 h-8 rounded-md border border-border text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                  aria-label="Cancel"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-foreground truncate ml-3">{user?.full_name || "—"}</span>
                <button
                  onClick={() => { setName(user?.full_name || ""); setEditingName(true); }}
                  className="ml-2 w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors shrink-0"
                  aria-label="Edit name"
                  title="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Email — locked once set */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Email</span>
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-sm text-foreground truncate">{user?.email || "—"}</span>
              {isEmailLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          </div>

          {/* Business Type — locked once set */}
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Business Type</span>
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-sm text-foreground truncate">{workspace?.business_type || "—"}</span>
              {isBusinessTypeLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="pt-4 mt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setShowChangePwd(true)}>
            <KeyRound className="w-3.5 h-3.5" /> Change Password
          </Button>
        </div>
      </div>

      {/* ---- Workspace / Business ---- */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Business & Workspace</h3>
        </div>

        {/* Branding Image — single image used across the entire app */}
        <div className="mb-1">
          <h4 className="text-sm font-semibold text-foreground">Branding Image</h4>
          <p className="text-xs text-muted-foreground mt-0.5">This image is used as your workspace logo, sidebar avatar, invoice logo, and on all public pages.</p>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
            {form.logo
              ? <img src={form.logo} alt="Branding image" className="w-full h-full object-cover" />
              : <Upload className="w-5 h-5 text-muted-foreground" />}
          </div>
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => logoFileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : form.logo ? "Replace" : "Upload Image"}
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
          <Field label="Business / Workspace Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>

          {/* Tagline */}
          <Field label="Tagline"><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Capturing moments that last forever" /></Field>

          {/* Website */}
          <Field label="Website">
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://yourwebsite.com" className="pl-9" />
            </div>
          </Field>

          {/* Phone — locked once set */}
          <Field label="Business Phone">
            <div className="relative">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                readOnly={isPhoneLocked}
                placeholder="10-digit mobile (e.g. 9876543210)"
                inputMode="tel"
                maxLength="13"
                className={isPhoneLocked ? "bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" : "pr-8"}
              />
              {isPhoneLocked && <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </Field>

          {/* Email — locked once set */}
          <Field label="Business Email">
            <div className="relative">
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                readOnly={isEmailLocked}
                placeholder="you@example.com"
                className={isEmailLocked ? "bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" : "pr-8"}
              />
              {isEmailLocked && <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </Field>

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

          {/* Region Settings */}
          <div className="pt-3 mt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Region Settings</h4>
            <div className="space-y-3">
              <Field label="Timezone">
                <Select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                  {timezones.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Date Format">
                <Select value={form.date_format} onChange={(e) => set("date_format", e.target.value)}>
                  {dateFormats.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </Select>
              </Field>
              <Field label="Number Format">
                <Select value={form.number_format} onChange={(e) => set("number_format", e.target.value)}>
                  {numberFormats.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
                </Select>
              </Field>
              <Field label="Financial Year Start Month">
                <Select value={form.fy_start_month} onChange={(e) => set("fy_start_month", Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
            </div>
          </div>

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

          {/* Public Profile URL — uses Business & Workspace info only */}
          <div className="pt-3 mt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-1">Public Profile URL</h4>
            <p className="text-xs text-muted-foreground mb-3">Publish a shareable public page using your business name, tagline, logo, website, phone, email, and address.</p>
            <div className="space-y-3">
              <Toggle
                checked={form.public_profile_enabled}
                onChange={(v) => set("public_profile_enabled", v)}
                label="Publish public profile"
              />
              <Field label="Profile URL Slug">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{window.location.origin}/p/</span>
                  <Input
                    value={form.public_profile_slug}
                    onChange={(e) => set("public_profile_slug", slugify(e.target.value))}
                    placeholder="your-business"
                    className="flex-1"
                  />
                </div>
                {form.public_profile_slug && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 min-w-0 px-3 py-1.5 rounded-md bg-muted text-xs text-muted-foreground truncate">
                      {window.location.origin}/p/{form.public_profile_slug}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/p/${form.public_profile_slug}`);
                        setCopiedSlug(true);
                        setTimeout(() => setCopiedSlug(false), 2000);
                      }}
                      className="shrink-0 p-2 rounded-md border border-border hover:bg-muted transition-colors"
                      aria-label="Copy link"
                    >
                      {copiedSlug ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {form.public_profile_enabled && (
                      <a href={`${window.location.origin}/p/${form.public_profile_slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-md border border-border hover:bg-muted transition-colors" aria-label="Open profile">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </Field>
            </div>
          </div>

          <Button onClick={saveWorkspace} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Settings"}
          </Button>
        </div>
      </div>

      <ChangePasswordDialog open={showChangePwd} onClose={() => setShowChangePwd(false)} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground truncate ml-3">{value}</span>
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