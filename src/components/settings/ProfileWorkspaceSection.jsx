import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import ChangePasswordDialog from "@/components/settings/ChangePasswordDialog";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import {
  Rocket, X, Pencil, Check, Loader2, Upload, User, Building2, Lock, KeyRound, Globe, Copy, ExternalLink,
  Share2, Instagram, Youtube, Twitter, Crown, Save, Plus, Trash2,
} from "lucide-react";
import { EXTRA_SOCIAL_ICON_OPTIONS } from "@/lib/socialIcons";
import { isValidIndianMobile, isValidEmail, sanitizePhoneInput, PHONE_HINT, sanitizeEmailInput, firstSocialLinkError, validateSocialUrl } from "@/lib/validation";
import { lookupCity } from "@/lib/cityMapping";
import { useFeatureGate } from "@/components/common/ProGate";

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

function _slugify(text) {
  return (text || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

const SLUG_MIN = 3;
// While typing: lowercase, letters/numbers/hyphens only (a trailing hyphen is allowed mid-typing).
const sanitizeSlugInput = (text) => (text || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-/, "").slice(0, 40);
const normalizeSlug = (text) => sanitizeSlugInput(text).replace(/-$/, "");


function safeParseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

export default function ProfileWorkspaceSection() {
  const { user, checkUserAuth } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const setup = useSetupProgress();
  const [copiedSlug, setCopiedSlug] = useState(false);
  const { isPro, checkFeature, FeatureGateDialog } = useFeatureGate();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [savingName, setSavingName] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const [form, setForm] = useState(null);
  const [savedForm, setSavedForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoFileRef = useRef(null);

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
  const isSlugLocked = !!(workspace?.public_profile_slug?.trim());

  // Live availability of the chosen public URL (only while it can still be chosen).
  const [slugStatus, setSlugStatus] = useState("idle"); // idle | invalid | checking | available | taken | error
  const slugToCheck = form ? normalizeSlug(form.public_profile_slug) : "";
  useEffect(() => {
    if (isSlugLocked || !workspace?.id) return;
    if (!slugToCheck) { setSlugStatus("idle"); return; }
    if (slugToCheck.length < SLUG_MIN) { setSlugStatus("invalid"); return; }
    setSlugStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_public_slug_available", { p_slug: slugToCheck, p_workspace_id: workspace.id });
      if (cancelled) return;
      setSlugStatus(error ? "error" : data ? "available" : "taken");
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [slugToCheck, isSlugLocked, workspace?.id]);

  const dp = safeParseJson(workspace?.display_preferences, {});

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
      logo: workspace.logo || "", public_profile_enabled: !!workspace.public_profile_enabled,
      public_profile_slug: workspace.public_profile_slug || "",
      public_profile_about: workspace.public_profile_about || "",
      public_show_phone: dp.public_show_phone !== false, public_show_email: dp.public_show_email !== false,
      public_show_address: dp.public_show_address !== false, public_show_website: dp.public_show_website !== false,
      public_show_social: dp.public_show_social !== false,
      social_instagram: dp.social_instagram || "", social_youtube: dp.social_youtube || "",
      social_twitter: dp.social_twitter || dp.social_portfolio || "",
      social_extra: Array.isArray(dp.social_extra) ? dp.social_extra.slice(0, 2) : [],
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

  const addExtraSocial = () => {
    if (form.social_extra.length >= 2) return;
    set("social_extra", [...form.social_extra, { icon: "facebook", url: "" }]);
  };
  const updateExtraSocial = (i, field, value) => {
    set("social_extra", form.social_extra.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };
  const removeExtraSocial = (i) => {
    set("social_extra", form.social_extra.filter((_, idx) => idx !== i));
  };

  // Auto-fill state & country when city matches a known Indian city — still editable after.
  const onCityChange = (val) => {
    set("city", val);
    const match = lookupCity(val);
    if (match) {
      setForm((f) => ({ ...f, city: val, state: match.state, country: match.country }));
    }
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkFeature("quotation_logo_enabled", "Branding Image / Logo")) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please choose an image file." }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large (max 5MB)." }); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo", file_url);
      setSavedForm((f) => (f ? { ...f, logo: file_url } : f));
      await base44.entities.Workspace.update(workspace.id, { logo: file_url });
      setWorkspace((w) => ({ ...w, logo: file_url }));
      toast({ title: "Logo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
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
    const socialErr = firstSocialLinkError({
      instagram: form.social_instagram, youtube: form.social_youtube, twitter: form.social_twitter,
      website: form.website, extra: form.social_extra,
    });
    if (socialErr) {
      toast({ title: "Invalid link", description: socialErr, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const existingDp = safeParseJson(workspace?.display_preferences, {});
      const updatedDp = {
        ...existingDp,
        public_show_phone: form.public_show_phone, public_show_email: form.public_show_email,
        public_show_address: form.public_show_address, public_show_website: form.public_show_website,
        public_show_social: form.public_show_social,
        social_instagram: form.social_instagram, social_youtube: form.social_youtube,
        social_twitter: form.social_twitter, social_extra: form.social_extra,
      };
      const payload = {
        name: form.name, tagline: form.tagline, website: form.website,
        phone: form.phone, email: form.email, address: form.address,
        city: form.city, state: form.state, country: form.country,
        currency: form.currency, timezone: form.timezone, date_format: form.date_format,
        number_format: form.number_format, fy_start_month: form.fy_start_month,
        gst_enabled: form.gst_enabled, gstin: form.gstin,
        gst_business_name: form.gst_business_name, gst_billing_address: form.gst_billing_address,
        gst_state: form.gst_state, default_gst_rate: form.default_gst_rate,
        public_profile_enabled: form.public_profile_enabled,
        public_profile_about: form.public_profile_about,
        display_preferences: JSON.stringify(updatedDp),
      };
      // The public URL is chosen by the user and permanent once saved, so it's only written
      // when they publish (never silently locked from the prefilled suggestion).
      const finalForm = { ...form };
      if (!isSlugLocked && form.public_profile_enabled) {
        const slug = normalizeSlug(form.public_profile_slug);
        if (slug.length < SLUG_MIN) {
          toast({ title: "Choose your public URL", description: `Use at least ${SLUG_MIN} letters or numbers.`, variant: "destructive" });
          return;
        }
        const { data: free, error: availErr } = await supabase.rpc("is_public_slug_available", { p_slug: slug, p_workspace_id: workspace.id });
        if (availErr) throw availErr;
        if (!free) {
          setSlugStatus("taken");
          toast({ title: "That URL is taken", description: `/p/${slug} belongs to another business. Pick a different one.`, variant: "destructive" });
          return;
        }
        payload.public_profile_slug = slug;
        finalForm.public_profile_slug = slug;
      }
      let updated;
      try {
        updated = await base44.entities.Workspace.update(workspace.id, payload);
      } catch (e) {
        if (e?.code === "23505" || /duplicate|unique/i.test(e?.message || "")) {
          setSlugStatus("taken");
          throw new Error("That public URL was just taken. Pick a different one.");
        }
        throw e;
      }
      setForm(finalForm);
      setWorkspace(updated);
      setSavedForm(finalForm);
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

        {/* Branding Image */}
        <div className="mb-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Branding Image</h4>
            {!isPro && (
              <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                <Crown className="w-3 h-3" /> Pro
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">This image is used as your workspace logo, sidebar avatar, invoice logo, and on all public pages.</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Recommended: <span className="font-medium text-foreground">512 × 512 px</span> (square)</span>
            <span className="text-muted-foreground">Maximum size: <span className="font-medium text-foreground">5 MB</span></span>
            <span className="text-muted-foreground">Format: <span className="font-medium text-foreground">PNG / JPG / WebP</span></span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
            {form.logo ? <img src={form.logo} alt="Branding image" className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
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
                  setSavedForm((f) => (f ? { ...f, logo: "" } : f));
                  setWorkspace((w) => ({ ...w, logo: "" }));
                  toast({ title: "Logo removed" });
                } catch (err) { toast({ title: "Failed to remove logo", description: err.message, variant: "destructive" }); }
              }}>Remove</Button>
            )}
          </div>
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
                <Select value={form.fy_start_month} onChange={(e) => set("fy_start_month", Number(e.target.value))} className="w-full">
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

          {/* Public Profile URL */}
          <div className="pt-3 mt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-1">Public Profile URL</h4>
            <p className="text-xs text-muted-foreground mb-3">Publish a shareable public page using your business name, tagline, logo, website, phone, email, and address.</p>
            <div className="space-y-3">
              <Toggle checked={form.public_profile_enabled} onChange={(v) => set("public_profile_enabled", v)} label="Publish public profile" />
              <Field label="Profile URL Slug">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{window.location.origin}/p/</span>
                  <div className="relative flex-1">
                    <Input value={form.public_profile_slug} onChange={(e) => set("public_profile_slug", sanitizeSlugInput(e.target.value))} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="your-business" readOnly={isSlugLocked} className={isSlugLocked ? "w-full bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" : "w-full pr-8"} />
                    {isSlugLocked && <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>
                {isSlugLocked ? (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    This URL is permanent and can't be changed.
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs min-h-[1rem]" aria-live="polite">
                      {slugStatus === "checking" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Checking availability…</span>}
                      {slugStatus === "available" && <span className="inline-flex items-center gap-1 text-success font-medium"><Check className="w-3 h-3" /> /p/{slugToCheck} is available</span>}
                      {slugStatus === "taken" && <span className="inline-flex items-center gap-1 text-destructive font-medium"><X className="w-3 h-3" /> /p/{slugToCheck} is already taken — try another</span>}
                      {slugStatus === "invalid" && <span className="text-muted-foreground">Use at least {SLUG_MIN} letters or numbers.</span>}
                      {slugStatus === "error" && <span className="text-muted-foreground">Couldn't check availability right now. It will be checked when you save.</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Lock className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Pick it carefully: once you save with the profile published, this URL is locked permanently.</span>
                    </p>
                  </div>
                )}
                {form.public_profile_slug && (isSlugLocked || form.public_profile_enabled) && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                    <div className="flex-1 min-w-0 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono break-all select-all">
                      {`${window.location.origin}/p/${form.public_profile_slug}`}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" aria-label="Copy link"
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${form.public_profile_slug}`); setCopiedSlug(true); setTimeout(() => setCopiedSlug(false), 2000); }}>
                        {copiedSlug ? <><Check className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </Button>
                      {form.public_profile_enabled && (
                        <Button size="sm" variant="outline" aria-label="Open profile in new tab"
                          onClick={() => window.open(`${window.location.origin}/p/${form.public_profile_slug}`, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Field>

              <Field label="About (shown on public profile)">
                <WordCounterTextarea value={form.public_profile_about} onChange={(e) => set("public_profile_about", e.target.value)} placeholder="Tell visitors about your business, specialties, and what makes you unique…" rows={4} />
              </Field>

              <div className="pt-3 mt-3 border-t border-border">
                <h5 className="text-xs font-semibold text-foreground mb-1">Show on Public Page</h5>
                <p className="text-xs text-muted-foreground mb-3">Control which contact details are visible on your public profile.</p>
                <div className="space-y-2.5">
                  <VisibilityToggle label="Phone" checked={form.public_show_phone} onChange={(v) => set("public_show_phone", v)} />
                  <VisibilityToggle label="Email" checked={form.public_show_email} onChange={(v) => set("public_show_email", v)} />
                  <VisibilityToggle label="Address" checked={form.public_show_address} onChange={(v) => set("public_show_address", v)} />
                  <VisibilityToggle label="Website" checked={form.public_show_website} onChange={(v) => set("public_show_website", v)} />
                  <VisibilityToggle label="Social Links" checked={form.public_show_social} onChange={(v) => set("public_show_social", v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="pt-3 mt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Social Links</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Shown on quotations and your public profile page. Icons auto-detect from the URL.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SocialField platform="instagram" label="Instagram" value={form.social_instagram} onChange={(v) => set("social_instagram", v)} placeholder="https://instagram.com/…" Icon={Instagram} />
              <SocialField platform="youtube" label="YouTube" value={form.social_youtube} onChange={(v) => set("social_youtube", v)} placeholder="https://youtube.com/…" Icon={Youtube} />
              <SocialField platform="twitter" label="Twitter / X" value={form.social_twitter} onChange={(v) => set("social_twitter", v)} placeholder="https://x.com/…" Icon={Twitter} />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Website</label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <div className="h-9 pl-9 pr-3 flex items-center rounded-md border border-border bg-muted/40 text-sm text-muted-foreground truncate">
                    {form.website || "Set the Website field above"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-semibold text-foreground">Additional Links (optional)</h5>
                {form.social_extra.length < 2 && (
                  <button type="button" onClick={addExtraSocial} className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add link
                  </button>
                )}
              </div>
              {form.social_extra.length === 0 ? (
                <p className="text-xs text-muted-foreground">No additional links added.</p>
              ) : (
                <div className="space-y-2">
                  {form.social_extra.map((s, i) => {
                    const opt = EXTRA_SOCIAL_ICON_OPTIONS.find((o) => o.v === s.icon) || EXTRA_SOCIAL_ICON_OPTIONS[0];
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <Select value={s.icon} onChange={(e) => updateExtraSocial(i, "icon", e.target.value)} className="flex-1 sm:flex-none sm:w-36 min-w-0">
                          {EXTRA_SOCIAL_ICON_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </Select>
                        <div className="relative order-last basis-full sm:order-none sm:basis-0 sm:flex-1 min-w-0">
                          <opt.Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input value={s.url} onChange={(e) => updateExtraSocial(i, "url", e.target.value)} placeholder="https://…" className="!pl-9" />
                        </div>
                        {validateSocialUrl(s.url, s.icon || "other") && <p className="basis-full text-[11px] text-destructive">{validateSocialUrl(s.url, s.icon || "other")}</p>}
                        <button type="button" onClick={() => removeExtraSocial(i)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0" aria-label="Remove link">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <Button variant={isFormDirty ? "primary" : "outline"} onClick={saveWorkspace} disabled={saving || !isFormDirty}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Settings</>}
          </Button>
        </div>
      </div>

      <ChangePasswordDialog open={showChangePwd} onClose={() => setShowChangePwd(false)} />
      {FeatureGateDialog}
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

function VisibilityToggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function SocialField({ label, value, onChange, placeholder, Icon, platform }) {
  const err = validateSocialUrl(value, platform);
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="!pl-9" />
      </div>
      {err && <p className="text-[11px] mt-1 text-destructive">{err}</p>}
    </div>
  );
}