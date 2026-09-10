import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Camera,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  Receipt,
  PartyPopper,
  Ruler,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS } from "@/lib/BusinessTerminology";
import { seedWorkspacePresets } from "@/utils/presetSeeding";

const CURRENCIES = [
  { v: "INR", l: "INR (₹)" },
  { v: "USD", l: "USD ($)" },
  { v: "EUR", l: "EUR (€)" },
  { v: "AED", l: "AED (د.إ)" },
  { v: "GBP", l: "GBP (£)" },
];
const TIMEZONES = [
  { v: "Asia/Kolkata", l: "Asia/Kolkata (IST)" },
  { v: "Asia/Dubai", l: "Asia/Dubai (GST)" },
  { v: "UTC", l: "UTC" },
  { v: "America/New_York", l: "America/New_York (EST)" },
  { v: "Europe/London", l: "Europe/London (GMT)" },
];
const COUNTRIES = ["India", "United States", "United Kingdom", "United Arab Emirates", "Singapore", "Other"];
const GST_RATES = [0, 5, 12, 18, 28];

const STEPS = [
  { key: "category", label: "Category", icon: Building2 },
  { key: "business", label: "Business", icon: Briefcase },
  { key: "location", label: "Location", icon: MapPin },
  { key: "gst", label: "GST", icon: Receipt },
];

const CATEGORY_OPTIONS = [
  {
    value: BUSINESS_CATEGORIES.PHOTOGRAPHY,
    label: "Photography",
    description: "Photographers, videographers, wedding films",
    icon: Camera,
  },
  {
    value: BUSINESS_CATEGORIES.EVENT_MANAGEMENT,
    label: "Event Management",
    description: "Event planners, decorators, production houses",
    icon: PartyPopper,
  },
  {
    value: BUSINESS_CATEGORIES.ARCHITECTURE,
    label: "Architecture",
    description: "Architects, interior designers, contractors",
    icon: Ruler,
  },
  {
    value: BUSINESS_CATEGORIES.OTHER,
    label: "Other Service Business",
    description: "Consulting, agencies, freelance, custom",
    icon: Briefcase,
  },
];

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    business_category: "",
    custom_business_type: "",
    name: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    currency: "INR",
    timezone: "Asia/Kolkata",
    gst_enabled: false,
    gstin: "",
    gst_business_name: "",
    gst_billing_address: "",
    gst_state: "",
    default_gst_rate: 18,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return !!form.business_category;
    if (step === 1) {
      if (!form.name.trim()) return false;
      if (form.business_category === BUSINESS_CATEGORIES.OTHER && !form.custom_business_type.trim()) return false;
      return true;
    }
    if (step === 2) return form.city.trim() && form.country;
    if (step === 3) return !form.gst_enabled || (form.gstin.trim() && form.gst_business_name.trim());
    return true;
  };

  const handleCreate = async () => {
    setError("");
    setSaving(true);
    try {
      const ws = await base44.entities.Workspace.create({
        name: form.name.trim(),
        business_category: form.business_category,
        custom_business_type: form.business_category === BUSINESS_CATEGORIES.OTHER ? form.custom_business_type.trim() : "",
        business_type: form.business_category === BUSINESS_CATEGORIES.OTHER
          ? form.custom_business_type.trim()
          : CATEGORY_LABELS[form.business_category],
        owner_user_id: user.id,
        owner_name: user.full_name || form.name.trim(),
        is_active: true,
        onboarding_completed: true,
        email: form.email.trim(),
        phone: form.phone.trim(),
        logo: "",
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country,
        currency: form.currency,
        timezone: form.timezone,
        plan_type: "free",
        plan_status: "active",
        member_user_ids: [user.id],
        gst_enabled: form.gst_enabled,
        gstin: form.gst_enabled ? form.gstin.trim() : "",
        gst_business_name: form.gst_enabled ? form.gst_business_name.trim() : "",
        gst_billing_address: form.gst_enabled ? form.gst_billing_address.trim() : "",
        gst_state: form.gst_enabled ? form.gst_state.trim() : "",
        default_gst_rate: form.gst_enabled ? Number(form.default_gst_rate) : null,
      });
      await base44.entities.WorkspaceMember.create({
        workspace_id: ws.id,
        workspace_owner_id: user.id,
        user_id: user.id,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });
      // Initialize the default Free subscription for this workspace
      try {
        await base44.functions.invoke("initializeFreePlan", { workspace_id: ws.id });
      } catch {
        /* non-blocking — PlanContext defaults to Free if no subscription exists */
      }
      // Initialize the current Financial Year for this workspace
      try {
        await base44.functions.invoke("initializeFinancialYear", { workspace_id: ws.id });
      } catch {
        /* non-blocking — FinancialYearProvider will retry on first load */
      }
      // Seed industry-specific presets (team roles, services, expense categories)
      try {
        await seedWorkspacePresets(ws.id, form.business_category);
      } catch {
        /* non-blocking — user can configure manually */
      }
      const updateData = { active_workspace_id: ws.id, workspace_ids: [ws.id] };
      if (form.phone.trim()) updateData.phone = form.phone.trim();
      try {
        await base44.auth.updateMe(updateData);
      } catch {
        /* non-blocking */
      }
      setStep("success");
    } catch (err) {
      setError(err.message || "Failed to create workspace. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const enterApp = () => navigate("/dashboard", { replace: true });

  if (step === "success") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace created</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {form.name} is ready on the Free plan. Welcome to Kramashah.
          </p>
          <Button className="mt-8 h-12 w-full text-base font-medium" onClick={enterApp}>
            Enter Kramashah <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const StepIcon = STEPS[step]?.icon;

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Camera className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Kramashah</span>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > i;
            const active = step === i;
            return (
              <div key={s.key} className="flex flex-1 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                        ? "border-success bg-success/15 text-success"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`hidden text-xs font-medium sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${done ? "bg-success" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {/* Step 0: Business Category Selection */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">What type of business do you run?</h2>
                <p className="text-sm text-muted-foreground">This sets up your workspace terminology and starter presets.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CATEGORY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = form.business_category === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("business_category", opt.value)}
                      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                      {selected && (
                        <div className="absolute top-3 right-3">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Business Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tell us about your business</h2>
                <p className="text-sm text-muted-foreground">This becomes your workspace name in Kramashah.</p>
              </div>
              {form.business_category === BUSINESS_CATEGORIES.OTHER && (
                <div className="space-y-2">
                  <Label htmlFor="custom_business_type">Business Type / Industry Name</Label>
                  <Input
                    id="custom_business_type"
                    value={form.custom_business_type}
                    onChange={(e) => set("custom_business_type", e.target.value)}
                    placeholder="e.g. Interior Design, Consulting, Production House"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Required for Other Service Business.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Business / Workspace Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Krishna Shah Photography"
                  autoFocus={form.business_category !== BUSINESS_CATEGORIES.OTHER}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="studio@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98200 11223" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Location & preferences</h2>
                <p className="text-sm text-muted-foreground">Used for currency, dates, and quotations.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Mumbai" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Maharashtra" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <select id="country" value={form.country} onChange={(e) => set("country", e.target.value)} className={fieldClass}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select id="currency" value={form.currency} onChange={(e) => set("currency", e.target.value)} className={fieldClass}>
                    {CURRENCIES.map((c) => (
                      <option key={c.v} value={c.v}>{c.l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select id="timezone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={fieldClass}>
                    {TIMEZONES.map((t) => (
                      <option key={t.v} value={t.v}>{t.l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: GST */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">GST registration</h2>
                <p className="text-sm text-muted-foreground">You can change this later in Preferences.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set("gst_enabled", false)}
                  className={`h-12 rounded-lg border text-sm font-medium transition-colors ${
                    !form.gst_enabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  No, skip
                </button>
                <button
                  type="button"
                  onClick={() => set("gst_enabled", true)}
                  className={`h-12 rounded-lg border text-sm font-medium transition-colors ${
                    form.gst_enabled ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Yes, GST registered
                </button>
              </div>

              {form.gst_enabled && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input id="gstin" value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst_business_name">Registered Business Name</Label>
                    <Input id="gst_business_name" value={form.gst_business_name} onChange={(e) => set("gst_business_name", e.target.value)} placeholder="Krishna Shah Photography Pvt Ltd" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst_billing_address">GST Billing Address</Label>
                    <Input id="gst_billing_address" value={form.gst_billing_address} onChange={(e) => set("gst_billing_address", e.target.value)} placeholder="123 Business Park, Mumbai" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gst_state">State</Label>
                      <Input id="gst_state" value={form.gst_state} onChange={(e) => set("gst_state", e.target.value)} placeholder="Maharashtra" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_gst_rate">Default GST Rate (%)</Label>
                      <select id="default_gst_rate" value={form.default_gst_rate} onChange={(e) => set("default_gst_rate", Number(e.target.value))} className={fieldClass}>
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={saving}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!canNext() || saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    Create Workspace <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}