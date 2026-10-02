import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, User, Phone, Mail, Globe, Building2, MapPin, Receipt, PartyPopper, Camera, Briefcase, Compass, Sofa, Scissors, Megaphone, UtensilsCrossed, HardHat } from "lucide-react";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_OPTIONS, categoryLabel } from "@/lib/businessTerminology";
import { BUSINESS_TYPE_ICONS } from "@/lib/businessTypeProfiles";
import { getIndustryPresets } from "@/constants/industryPresets";
import { getMemberTypePresets } from "@/lib/memberTypeService";
import { getExpenseCategoryPresets } from "@/constants/financeConfig";
import { ensureDefaultFY } from "@/lib/financialYearService";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { isValidIndianMobile, sanitizePhoneInput, sanitizeEmailInput, isStrictEmail, PHONE_HINT } from "@/lib/validation";
import { withRetry } from "@/lib/apiRetry";
import { cn } from "@/lib/utils";

const currencies = ["INR (₹)", "USD ($)", "EUR (€)", "AED (د.إ)"];
const timezones = [
  { v: "Asia/Kolkata", l: "Asia/India" },
  { v: "UTC", l: "UTC" },
  { v: "Asia/Dubai", l: "Asia/Dubai" },
  { v: "America/New_York", l: "America/New_York" },
];
const gstRates = [0, 5, 12, 18, 28];

// Same look as the Sign in / Sign up fields: tall, white, rounded-xl, leading icon.
const AUTH_INPUT = "h-12 bg-white border-[#E5E3DF] rounded-xl text-[#1A1D21] placeholder:text-[#B5B7BB]";
const AUTH_SELECT = "w-full h-12 px-3 bg-white border border-[#E5E3DF] rounded-xl text-[#1A1D21] focus:outline-none focus:ring-2 focus:ring-ring/40";
const BTN_PRIMARY = "h-12 bg-[#2D4899] hover:bg-[#243A7A] text-white font-medium rounded-xl";
const BTN_OUTLINE = "h-12 rounded-xl border-[#E5E3DF] bg-white text-[#1A1D21] hover:bg-[#F5F3EF]";
const FIELD_ICONS = {
  custom_business_type: Briefcase, your_name: User, name: Building2, phone: Phone, email: Mail,
  city: MapPin, state: MapPin, country: Globe, gstin: Receipt, gst_business_name: Building2,
  gst_billing_address: MapPin, gst_state: MapPin,
};

function IconInput({ icon: Icon, className, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8F9296]" aria-hidden="true" />
      <Input className={cn(AUTH_INPUT, "pl-11", className)} {...props} />
    </div>
  );
}

const ICON_COMPONENTS = { Camera, PartyPopper, Building2, Sofa, Scissors, Briefcase, Megaphone, UtensilsCrossed, HardHat, Compass };
const CATEGORY_ICONS = Object.fromEntries(Object.entries(BUSINESS_TYPE_ICONS).map(([key, name]) => [key, ICON_COMPONENTS[name]]));

export default function Onboarding() {
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { saving, start, stop } = useSubmitGuard();
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState("");
  const [enterError, setEnterError] = useState("");
  const [form, setForm] = useState({
    your_name: "", name: "", business_category: "", custom_business_type: "", business_type: "",
    phone: "", email: sanitizeEmailInput(user?.email), city: "", state: "", country: "India", currency: "INR", timezone: "Asia/Kolkata",
    gst_enabled: false, gstin: "", gst_business_name: "", gst_billing_address: "", gst_state: "", default_gst_rate: 18
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const createdRef = useRef(false);

  // Someone who already has a workspace (refresh, back button, second tab) must not
  // be able to create another one — send them straight into the app.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    base44.entities.WorkspaceMember.filter({ user_id: user.id })
      .then((m) => { if (!cancelled && !createdRef.current && m && m.length > 0) navigate("/events", { replace: true }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, navigate]);

  // Warm the first screens' code while the welcome page is showing.
  useEffect(() => {
    if (step === 5) { import("@/pages/Events").catch(() => {}); import("@/pages/Dashboard").catch(() => {}); }
  }, [step]);

  const createWorkspace = async () => {
    if (!start()) return;
    setError("");
    if (!form.your_name.trim()) { setError("Please enter your name."); stop(); return; }
    if (!form.name.trim()) { setError("Please enter your business name."); stop(); return; }
    if (!form.phone.trim() || !isValidIndianMobile(form.phone)) { setError(PHONE_HINT); stop(); return; }
    if (!form.email.trim() || !isStrictEmail(form.email)) { setError("Please enter a valid email address (letters, numbers and . _ % + - only)."); stop(); return; }
    if (!form.city.trim()) { setError("Please enter your city."); stop(); return; }
    if (!form.state.trim()) { setError("Please enter your state."); stop(); return; }
    try {
      const category = form.business_category || BUSINESS_CATEGORIES.OTHER;
      const businessType = category === BUSINESS_CATEGORIES.OTHER ? (form.custom_business_type || "Other") : categoryLabel(category);
      const { error: profileErr } = await withRetry(() => supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: form.your_name.trim(), phone: form.phone || null }, { onConflict: 'id' }));
      if (profileErr) { setError("Could not create your profile: " + profileErr.message); stop(); return; }
      const { your_name, ...workspaceData } = form;
      const presets = getIndustryPresets(category);
      const memberTypes = getMemberTypePresets(category);
      const workspace = await withRetry(() => base44.entities.Workspace.create({ ...workspaceData, email: form.email.trim(), business_category: category, business_type: businessType, owner_user_id: user.id, plan_type: "free", plan_status: "active", team_member_types: JSON.stringify(memberTypes) }));
      await withRetry(() => base44.entities.WorkspaceMember.create({ workspace_id: workspace.id, user_id: user.id, role: "owner", status: "active" }));
      createdRef.current = true;

      // Everything below only needs the workspace + membership, so run it in parallel
      // instead of one round trip after another. Failed tasks get one retry.
      const tasks = {
        link: () => base44.auth.updateMe({ linked_workspace_id: workspace.id }),
        roles: async () => { if (presets.roles.length > 0) await base44.entities.TeamRole.bulkCreate(presets.roles.map((r) => ({ ...r, workspace_id: workspace.id, status: "active" }))); },
        expenses: () => base44.entities.ExpenseCategory.bulkCreate(getExpenseCategoryPresets(category).map((n) => ({ workspace_id: workspace.id, name: n, status: "active" }))),
        fy: () => ensureDefaultFY(workspace.id),
        plan: async () => {
          const existingSubs = await base44.entities.WorkspaceSubscription.filter({ workspace_id: workspace.id });
          if (existingSubs && existingSubs.length > 0) return;
          const plans = await base44.entities.Plan.filter({ code: "FREE" });
          const freePlan = plans && plans[0];
          if (!freePlan) return;
          const today = new Date().toISOString().split("T")[0];
          await base44.entities.WorkspaceSubscription.create({ workspace_id: workspace.id, plan_id: freePlan.id, pricing_id: "", status: "ACTIVE", started_at: today, expires_at: "", auto_renew: false, source: "ONBOARDING", assigned_price: 0, billing_cycle_snapshot: "", updated_by: user.id, note: "Initial Free plan" });
        },
        services: async () => {
          if (!Array.isArray(presets.services) || presets.services.length === 0) return;
          const existing = await base44.entities.Service.filter({ workspace_id: workspace.id });
          if (existing && existing.length > 0) return;
          await base44.entities.Service.bulkCreate(presets.services.map((s) => ({ ...s, workspace_id: workspace.id, status: "active" })));
        },
      };
      const names = Object.keys(tasks);
      const first = await Promise.allSettled(names.map((n) => tasks[n]()));
      const failed = names.filter((_, i) => first[i].status === "rejected");
      if (failed.length > 0) {
        await new Promise((r) => setTimeout(r, 600));
        await Promise.allSettled(failed.map((n) => tasks[n]()));
      }
      // Refresh the cached user so Preferences shows the same full name entered here.
      try { await checkUserAuth(false); } catch { /* non-fatal */ }
      setStep(5);
    } catch (err) { setError(err.message || "Failed to create workspace. Please try again."); }
    finally { stop(); }
  };

  const enterApp = async () => {
    if (entering) return;
    setEntering(true);
    setEnterError("");
    try {
      const memberships = await withRetry(() => base44.entities.WorkspaceMember.filter({ user_id: user.id }));
      if (!memberships || memberships.length === 0) throw new Error("Your workspace is still being set up.");
      navigate("/events", { replace: true });
    } catch (e) {
      setEnterError(e?.message || "Couldn't open your workspace.");
      setEntering(false);
    }
  };

  const canNext1 = !!form.business_category && (form.business_category !== BUSINESS_CATEGORIES.OTHER || form.custom_business_type.trim());
  const canNext2 = form.your_name.trim() && form.name.trim() && form.phone.trim() && isValidIndianMobile(form.phone) && isStrictEmail(form.email);
  const canNext3 = form.city.trim() && form.state.trim() && form.country.trim();

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6"><Logo size={48} className="rounded-xl bg-white shadow-sm" /></div>
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{step > s ? <Check className="w-4 h-4" /> : s}</div>
              {s < 4 && <div className={`h-0.5 flex-1 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
          {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          {step === 1 && (
            <StepShell icon={Compass} title="What type of business do you run?" subtitle="Choose your industry — you can change this later.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUSINESS_CATEGORY_OPTIONS.map((opt) => {
                  const Icon = CATEGORY_ICONS[opt.value];
                  const selected = form.business_category === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => set("business_category", opt.value)} className={`text-left p-4 rounded-xl border-2 transition-all ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="w-4.5 h-4.5" /></div>
                      <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</div>
                    </button>
                  );
                })}
              </div>
              {form.business_category === BUSINESS_CATEGORIES.OTHER && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label className="text-sm font-medium text-[#1A1D21]">Business Type / Industry Name <span className="text-destructive">*</span></Label>
                  <IconInput icon={FIELD_ICONS.custom_business_type} value={form.custom_business_type} onChange={(e) => set("custom_business_type", e.target.value)} placeholder="Business type / industry" autoFocus />
                  <p className="text-xs text-muted-foreground">Tell us what you do — this customises your workspace.</p>
                </div>
              )}
              <Button className={cn(BTN_PRIMARY, "w-full mt-2")} disabled={!canNext1} onClick={() => setStep(2)}>Continue</Button>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell icon={Building2} title="Business Details" subtitle="Tell us about your business.">
              <Field label="Your Name *"><IconInput icon={FIELD_ICONS.your_name} value={form.your_name} onChange={(e) => set("your_name", e.target.value)} placeholder="Full name" autoFocus name="your_name" autoComplete="name" /></Field>
              <Field label="Business / Workspace Name *"><IconInput icon={FIELD_ICONS.name} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Business name" name="workspace_name" autoComplete="organization" /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone *"><IconInput icon={FIELD_ICONS.phone} value={form.phone} onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))} inputMode="tel" placeholder="Mobile number" /></Field>
                <Field label="Email *"><IconInput icon={FIELD_ICONS.email} type="email" value={form.email} onChange={(e) => set("email", sanitizeEmailInput(e.target.value))} placeholder="Email address" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} name="email" /></Field>
              </div>
              <div className="flex gap-2 mt-2"><Button variant="outline" className={cn(BTN_OUTLINE, "flex-1")} onClick={() => setStep(1)}>Back</Button><Button className={cn(BTN_PRIMARY, "flex-1")} disabled={!canNext2} onClick={() => setStep(3)}>Continue</Button></div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell icon={MapPin} title="Location & Preferences" subtitle="Where is your business based?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City *"><IconInput icon={FIELD_ICONS.city} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" autoFocus /></Field>
                <Field label="State *"><IconInput icon={FIELD_ICONS.state} value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State" /></Field>
                <Field label="Country *"><IconInput icon={FIELD_ICONS.country} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Country" /></Field>
                <Field label="Currency"><select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={AUTH_SELECT}>{currencies.map((c) => <option key={c} value={c.split(" ")[0]}>{c}</option>)}</select></Field>
                <Field label="Timezone" className="sm:col-span-2"><select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className={AUTH_SELECT}>{timezones.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></Field>
              </div>
              <div className="flex gap-2 mt-2"><Button variant="outline" className={cn(BTN_OUTLINE, "flex-1")} onClick={() => setStep(2)}>Back</Button><Button className={cn(BTN_PRIMARY, "flex-1")} disabled={!canNext3} onClick={() => setStep(4)}>Continue</Button></div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell icon={Receipt} title="GST Registration" subtitle="Is your business GST registered?">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => set("gst_enabled", false)} className={`h-12 rounded-xl border text-sm font-medium ${!form.gst_enabled ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>No</button>
                <button onClick={() => set("gst_enabled", true)} className={`h-12 rounded-xl border text-sm font-medium ${form.gst_enabled ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>Yes</button>
              </div>
              {form.gst_enabled && (
                <div className="space-y-4 mt-4 animate-fade-in">
                  <Field label="GSTIN *"><IconInput icon={FIELD_ICONS.gstin} value={form.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="GSTIN" /></Field>
                  <Field label="Registered Business Name *"><IconInput icon={FIELD_ICONS.gst_business_name} value={form.gst_business_name} onChange={(e) => set("gst_business_name", e.target.value)} placeholder="Registered business name" /></Field>
                  <Field label="GST Billing Address *"><IconInput icon={FIELD_ICONS.gst_billing_address} value={form.gst_billing_address} onChange={(e) => set("gst_billing_address", e.target.value)} placeholder="Billing address" /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="GST State *"><IconInput icon={FIELD_ICONS.gst_state} value={form.gst_state} onChange={(e) => set("gst_state", e.target.value)} placeholder="State" /></Field>
                    <Field label="Default GST Rate (%)"><select value={form.default_gst_rate} onChange={(e) => set("default_gst_rate", Number(e.target.value))} className={AUTH_SELECT}>{gstRates.map((r) => <option key={r} value={r}>{r}%</option>)}</select></Field>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-2"><Button variant="outline" className={cn(BTN_OUTLINE, "flex-1")} onClick={() => setStep(3)}>Back</Button><Button className={cn(BTN_PRIMARY, "flex-1")} disabled={saving || (form.gst_enabled && (!form.gstin || !form.gst_business_name || !form.gst_billing_address || !form.gst_state))} onClick={createWorkspace}>{saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>) : "Create Workspace"}</Button></div>
            </StepShell>
          )}

          {step === 5 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><PartyPopper className="w-8 h-8 text-success" /></div>
              <h2 className="text-xl font-semibold">Workspace created!</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">{form.name} is ready. You're on the Free plan — welcome to Kramasha.</p>
              {enterError && <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{enterError}</div>}
              <Button className={cn(BTN_PRIMARY, "w-full")} disabled={entering} onClick={enterApp}>{entering ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading your workspace…</>) : (enterError ? "Try again" : "Enter Kramasha")}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>
        <div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{subtitle}</p></div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, className, children }) {
  return (<div className={className}><Label className="mb-2 block text-sm font-medium text-[#1A1D21]">{label}</Label>{children}</div>);
}