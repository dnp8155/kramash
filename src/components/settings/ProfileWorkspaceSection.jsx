import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFYMonthLock } from "@/hooks/useFYMonthLock";
import { setFyStartMonth } from "@/lib/dates";
import { useNavigate } from "react-router-dom";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import ChangePasswordDialog from "@/components/settings/ChangePasswordDialog";
import {
  Rocket, Pencil, Check, Loader2, User, Building2, Lock, KeyRound, Globe, IdCard, Save,
} from "lucide-react";
import { isValidIndianMobile, isValidEmail, sanitizePhoneInput, PHONE_HINT, sanitizeEmailInput, firstSocialLinkError } from "@/lib/validation";
import { lookupCity } from "@/lib/cityMapping";
import FadeImg from "@/components/common/FadeImg";

const currencies = [{ v: "INR", l: "INR (₹)" }, { v: "USD", l: "USD ($)" }, { v: "EUR", l: "EUR (€)" }, { v: "AED", l: "AED (د.إ)" }];
const timezones = [
  { v: "Asia/Kolkata", l: "Asia/India" },
  { v: "UTC", l: "UTC" },
  { v: "Asia/Dubai", l: "Asia/Dubai" },
  { v: "America/New_York", l: "America/New_York" },
  { v: "Europe/London", l: "Europe/London" },
  { v: "Australia/Sydney", l: "Australia/Sydney" },
];
const gstRates = [0, 5, 12, 18, 28];
// "DD MMM YYYY" is the default and the format new workspaces get — requires
// supabase/migrations/0017_date_format_enum_fix.sql to be applied (adds it to
// the database's date_format enum) before it can be saved.
const dateFormats = [
  { v: "DD MMM YYYY", l: "DD MMM YYYY (31 Dec 2026)" },
  { v: "DD/MM/YYYY", l: "DD/MM/YYYY (31/12/2026)" },
  { v: "MM/DD/YYYY", l: "MM/DD/YYYY (12/31/2026)" },
  { v: "YYYY-MM-DD", l: "YYYY-MM-DD (2026-12-31)" },
];
const numberFormats = [
  { v: "indian", l: "Indian (1,00,000)" },
  { v: "western", l: "International (100,000)" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


export default function ProfileWorkspaceSection() {
  const { user, checkUserAuth } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  // The FY start month is locked once financial years hold real data (an event or a payment).
  // Before that it can still be corrected; the empty year records are rebuilt on save.
  const queryClient = useQueryClient();
  const { locked: fyMonthLocked, yearIds: fyYearIds } = useFYMonthLock(workspace?.id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const setup = useSetupProgress();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [savingName, setSavingName] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const [form, setForm] = useState(null);
  const [savedForm, setSavedForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Some accounts ended up with full_name set to their email's local part
  // (e.g. "abc" from "abc@xyz.com") — never a real name the user chose, so
  // don't let that value lock the field. Once they save a real name it'll
  // differ from the email prefix and lock normally.
  const emailLocalPart = (user?.email || "").split("@")[0].trim().toLowerCase();
  const looksLikeEmailArtifact = !!emailLocalPart && user?.full_name?.trim().toLowerCase() === emailLocalPart;
  const isNameLocked = !!(user?.full_name?.trim()) && !looksLikeEmailArtifact;
  const isBusinessTypeLocked = !!(workspace?.business_type);
  const isPhoneLocked = !!(workspace?.phone);
  const isEmailLocked = !!(workspace?.email);

  if (!form && workspace) {
    const initial = {
      name: workspace.name || "", tagline: workspace.tagline || "", website: workspace.website || "",
      phone: workspace.phone || "", email: workspace.email || user?.email || "",
      address: workspace.address || "", city: workspace.city || "", state: workspace.state || "",
      country: workspace.country || "India", currency: workspace.currency || "INR",
      timezone: workspace.timezone || "Asia/Kolkata", date_format: workspace.date_format || "DD MMM YYYY",
      number_format: workspace.number_format || "indian", fy_start_month: workspace.fy_start_month ?? 4,
      gst_enabled: !!workspace.gst_enabled, gstin: workspace.gstin || "",
      gst_business_name: workspace.gst_business_name || "", gst_billing_address: workspace.gst_billing_address || "",
      gst_state: workspace.gst_state || "", default_gst_rate: workspace.default_gst_rate ?? 18,
      logo: workspace.logo || "",
    };
    setForm(initial);
    setSavedForm(initial);
  }

  const isFormDirty = !!(form && savedForm) && JSON.stringify(form) !== JSON.stringify(savedForm);

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
    } finally { setSavingName(false); }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-fill state & country when city matches a known Indian city — still editable after.
  const onCityChange = (val) => {
    set("city", val);
    const match = lookupCity(val);
    if (match) {
      setForm((f) => ({ ...f, city: val, state: match.state, country: match.country }));
    }
  };

  const saveWorkspace = async () => {
    if (form.phone && !isValidIndianMobile(form.phone)) {
      toast({ title: "Invalid phone", description: PHONE_HINT, variant: "destructive" });
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    const socialErr = firstSocialLinkError({ website: form.website });
    if (socialErr) {
      toast({ title: "Invalid link", description: socialErr, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name, tagline: form.tagline, website: form.website,
        phone: form.phone, email: form.email, address: form.address,
        city: form.city, state: form.state, country: form.country,
        currency: form.currency, timezone: form.timezone, date_format: form.date_format,
        number_format: form.number_format, fy_start_month: fyMonthLocked ? (workspace.fy_start_month ?? 4) : form.fy_start_month,
        gst_enabled: form.gst_enabled, gstin: form.gstin,
        gst_business_name: form.gst_business_name, gst_billing_address: form.gst_billing_address,
        gst_state: form.gst_state, default_gst_rate: form.default_gst_rate,
      };
      const updated = await base44.entities.Workspace.update(workspace.id, payload);
      // Start month corrected while the years are still empty: drop them so they are rebuilt from the new month.
      if (!fyMonthLocked && fyYearIds.length > 0 && Number(form.fy_start_month) !== Number(workspace.fy_start_month ?? 4)) {
        for (const yid of fyYearIds) { try { await base44.entities.FinancialYear.delete(yid); } catch { /* best effort */ } }
        try { Object.keys(localStorage).filter((k) => k.startsWith("fy-selected-") || k.startsWith("date-range-")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
        setFyStartMonth(updated?.fy_start_month ?? form.fy_start_month); // so the rebuilt years use the new month
        queryClient.invalidateQueries({ queryKey: ["financial-years"] });
        queryClient.invalidateQueries({ queryKey: ["fy-month-lock"] });
      }
      setForm(form);
      setWorkspace(updated);
      setSavedForm(form);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!form) return null;

  return (
    <div className="space-y-4">
      {/* Owner Profile */}
      <div className="bg-card border border-border rounded-[15px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Owner Profile</h3>
        </div>

        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Full Name</span>
            {isNameLocked ? (
              <div className="flex items-center gap-1.5 ml-3">
                <span className="text-sm text-foreground truncate">{user?.full_name}</span>
                <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
              </div>
            ) : editingName ? (
              <div className="flex items-center gap-2 ml-3 flex-1 justify-end">
                <input value={name} onChange={(e) => setName(e.target.value)} autoFocus name="full_name" autoComplete="name" className="flex-1 max-w-[180px] h-8 px-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40" />
                <button onClick={saveName} disabled={savingName} className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors shrink-0" aria-label="Save name" title="Save">
                  {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { setName(user?.full_name || ""); setEditingName(false); }} className="w-8 h-8 rounded-md border border-border text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors shrink-0" aria-label="Cancel" title="Cancel">✕</button>
              </div>
            ) : (
              <>
                <span className="text-sm text-foreground truncate ml-3">{user?.full_name || "—"}</span>
                <button onClick={() => { setName(user?.full_name || ""); setEditingName(true); }} className="ml-2 w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors shrink-0" aria-label="Edit name" title="Edit name">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Email</span>
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-sm text-foreground truncate">{user?.email || "—"}</span>
              {isEmailLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Business Type</span>
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-sm text-foreground truncate">{workspace?.business_type || "—"}</span>
              {isBusinessTypeLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-border flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowChangePwd(true)}>
            <KeyRound className="w-3.5 h-3.5" /> Change Password
          </Button>
          {setup.ready && !setup.complete && (
            <Button size="sm" onClick={() => { setup.reopen(); navigate("/events"); }}>
              <Rocket className="w-3.5 h-3.5" /> Complete setup
              <span className="ml-1 text-xs opacity-80">{setup.doneCount}/{setup.total}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Workspace / Business */}
      <div className="bg-card border border-border rounded-[15px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Business & Workspace</h3>
        </div>

        {/* Branding image: shown here, edited on My Profile */}
        <div className="flex items-center gap-3 mb-5 rounded-xl border border-border bg-muted/30 p-3">
          <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
            {workspace?.logo ? <FadeImg src={workspace.logo} alt="Branding image" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground">Branding Image</h4>
            <p className="text-xs text-muted-foreground mt-0.5">The same image is your logo here, in the sidebar, on invoices and quotations, and on My Profile. Change it on My Profile.</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate("/my-profile?open=logo")}>{workspace?.logo ? "Change" : "Add"}</Button>
        </div>

        <div className="space-y-3">
          <Field label="Business / Workspace Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} name="workspace_name" autoComplete="organization" /></Field>
          <Field label="Tagline"><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Tagline" /></Field>
          <Field label="Website">
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://yourwebsite.com" className="!pl-9" />
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Business Phone">
              <div className="relative">
                <Input value={form.phone} onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))} readOnly={isPhoneLocked} placeholder="Mobile number" inputMode="tel" className={isPhoneLocked ? "bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" : "pr-8"} />
                {isPhoneLocked && <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </Field>

            <Field label="Business Email">
              <div className="relative">
                <Input value={form.email} onChange={(e) => set("email", sanitizeEmailInput(e.target.value))} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} readOnly={isEmailLocked} placeholder="Email address" className={isEmailLocked ? "bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" : "pr-8"} />
                {isEmailLocked && <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </Field>
          </div>

          <Field label="Business Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="City"><Input value={form.city} onChange={(e) => onCityChange(e.target.value)} /></Field>
            <Field label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={(e) => set("currency", e.target.value)} className="w-full">
                {currencies.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </Select>
            </Field>
          </div>

          {/* Region Settings */}
          <div className="pt-3 mt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Region Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Timezone">
                <Select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className="w-full">
                  {timezones.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </Select>
              </Field>
              <Field label="Date Format">
                <Select value={form.date_format} onChange={(e) => set("date_format", e.target.value)} className="w-full">
                  {dateFormats.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </Select>
              </Field>
              <Field label="Number Format">
                <Select value={form.number_format} onChange={(e) => set("number_format", e.target.value)} className="w-full">
                  {numberFormats.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
                </Select>
              </Field>
              <Field label="Financial Year Start Month">
                {fyMonthLocked ? (
                  <>
                  <div className="relative">
                    <Input value={MONTHS[(workspace.fy_start_month ?? 4) - 1]} readOnly className="bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" />
                    <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Locked because your events or payments already sit in financial years built from this month. Changing it would misalign them.</p>
                  </>
                ) : (
                  <Select value={form.fy_start_month} onChange={(e) => set("fy_start_month", Number(e.target.value))} className="w-full">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </Select>
                )}
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
                <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="GSTIN" /></Field>
                <Field label="Registered Business Name"><Input value={form.gst_business_name} onChange={(e) => set("gst_business_name", e.target.value)} /></Field>
                <Field label="GST Billing Address"><Input value={form.gst_billing_address} onChange={(e) => set("gst_billing_address", e.target.value)} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="GST State"><Input value={form.gst_state} onChange={(e) => set("gst_state", e.target.value)} /></Field>
                  <Field label="Default GST Rate (%)">
                    <Select value={form.default_gst_rate} onChange={(e) => set("default_gst_rate", Number(e.target.value))} className="w-full">
                      {gstRates.map((r) => <option key={r} value={r}>{r}%</option>)}
                    </Select>
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-border flex justify-end">
            <Button size="sm" variant={isFormDirty ? "primary" : "outline"} onClick={saveWorkspace} disabled={saving || !isFormDirty}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </Button>
          </div>
        </div>
      </div>

      {/* Logo, social links and the shareable page live on My Profile */}
      <div className="bg-card border border-border rounded-[15px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><IdCard className="w-4 h-4 text-primary" /> My Profile</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Your logo, social links, public link, videos and services are managed on My Profile.</p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => navigate("/my-profile")}><IdCard className="w-4 h-4" /> Open My Profile</Button>
        </div>
      </div>

      <ChangePasswordDialog open={showChangePwd} onClose={() => setShowChangePwd(false)} />
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

