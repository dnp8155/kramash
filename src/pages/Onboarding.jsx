import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Building2, MapPin, Receipt, PartyPopper, Camera, Briefcase, Compass, Sofa, Scissors, Megaphone, UtensilsCrossed, HardHat } from "lucide-react";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_OPTIONS, categoryLabel } from "@/lib/businessTerminology";
import { BUSINESS_TYPE_ICONS } from "@/lib/businessTypeProfiles";
import { getIndustryPresets } from "@/constants/industryPresets";
import { getMemberTypePresets } from "@/lib/memberTypeService";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/constants/financeConfig";
import { ensureDefaultFY } from "@/lib/financialYearService";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { isValidIndianMobile, sanitizePhoneInput } from "@/lib/validation";

const currencies = ["INR (₹)", "USD ($)", "EUR (€)", "AED (د.إ)"];
const timezones = ["Asia/Kolkata", "UTC", "Asia/Dubai", "America/New_York"];
const gstRates = [0, 5, 12, 18, 28];

const ICON_COMPONENTS = { Camera, PartyPopper, Building2, Sofa, Scissors, Briefcase, Megaphone, UtensilsCrossed, HardHat, Compass };
const CATEGORY_ICONS = Object.fromEntries(Object.entries(BUSINESS_TYPE_ICONS).map(([key, name]) => [key, ICON_COMPONENTS[name]]));

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { saving, start, stop } = useSubmitGuard();
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    your_name: "", name: "", business_category: "", custom_business_type: "", business_type: "",
    phone: "", email: "", city: "", state: "", country: "India", currency: "INR", timezone: "Asia/Kolkata",
    gst_enabled: false, gstin: "", gst_business_name: "", gst_billing_address: "", gst_state: "", default_gst_rate: 18
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const createWorkspace = async () => {
    if (!start()) return;
    setError("");
    if (!form.your_name.trim()) { setError("Please enter your name."); stop(); return; }
    if (!form.name.trim()) { setError("Please enter your business name."); stop(); return; }
    if (!form.phone.trim() || !isValidIndianMobile(form.phone)) { setError("Enter a valid 10-digit Indian mobile number (starts with 6-9)."); stop(); return; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { setError("Please enter a valid email address."); stop(); return; }
    if (!form.city.trim()) { setError("Please enter your city."); stop(); return; }
    if (!form.state.trim()) { setError("Please enter your state."); stop(); return; }
    try {
      const category = form.business_category || BUSINESS_CATEGORIES.OTHER;
      const businessType = category === BUSINESS_CATEGORIES.OTHER ? (form.custom_business_type || "Other") : categoryLabel(category);
      const { error: profileErr } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: form.your_name.trim(), phone: form.phone || null }, { onConflict: 'id' });
      if (profileErr) { setError("Could not create your profile: " + profileErr.message); stop(); return; }
      const { your_name, ...workspaceData } = form;
      const workspace = await base44.entities.Workspace.create({ ...workspaceData, business_category: category, business_type: businessType, owner_user_id: user.id, plan_type: "free", plan_status: "active" });
      await base44.entities.WorkspaceMember.create({ workspace_id: workspace.id, user_id: user.id, role: "owner", status: "active" });
      try { await base44.auth.updateMe({ linked_workspace_id: workspace.id }); } catch (e) { }
      try { const presets = getIndustryPresets(category); if (presets.roles.length > 0) { await base44.entities.TeamRole.bulkCreate(presets.roles.map((r) => ({ ...r, workspace_id: workspace.id, status: "active" }))); } } catch (e) { }
      try { const memberTypes = getMemberTypePresets(category); await base44.entities.Workspace.update(workspace.id, { team_member_types: JSON.stringify(memberTypes) }); } catch (e) { }
      try { await base44.entities.ExpenseCategory.bulkCreate(DEFAULT_EXPENSE_CATEGORIES.map((n) => ({ workspace_id: workspace.id, name: n, status: "active" }))); } catch (e) { }
      try { await ensureDefaultFY(workspace.id); } catch (e) { }
      try {
        const presets = getIndustryPresets(category);
        const existingSubs = await base44.entities.WorkspaceSubscription.filter({ workspace_id: workspace.id });
        if (!existingSubs || existingSubs.length === 0) {
          const plans = await base44.entities.Plan.filter({ code: "FREE" });
          const freePlan = plans && plans[0];
          if (freePlan) {
            const today = new Date().toISOString().split("T")[0];
            await base44.entities.WorkspaceSubscription.create({ workspace_id: workspace.id, plan_id: freePlan.id, pricing_id: "", status: "ACTIVE", started_at: today, expires_at: "", auto_renew: false, source: "ONBOARDING", assigned_price: 0, billing_cycle_snapshot: "", updated_by: user.id, note: "Initial Free plan" });
          }
        }
        const existingServices = await base44.entities.Service.filter({ workspace_id: workspace.id });
        if ((!existingServices || existingServices.length === 0) && Array.isArray(presets.services)) {
          await base44.entities.Service.bulkCreate(presets.services.map((s) => ({ ...s, workspace_id: workspace.id, status: "active" })));
        }
      } catch (e) { }
      setStep(5);
    } catch (err) { setError(err.message || "Failed to create workspace. Please try again."); }
    finally { stop(); }
  };

  const enterApp = async () => {
    setEntering(true);
    try { for (let i = 0; i < 5; i++) { const memberships = await base44.entities.WorkspaceMember.filter({ user_id: user.id }); if (memberships && memberships.length > 0) break; await new Promise((r) => setTimeout(r, 400)); } } catch { }
    navigate("/events", { replace: true });
  };

  const canNext1 = !!form.business_category && (form.business_category !== BUSINESS_CATEGORIES.OTHER || form.custom_business_type.trim());
  const canNext2 = form.your_name.trim() && form.name.trim() && form.phone.trim() && isValidIndianMobile(form.phone) && form.email.trim() && /\S+@\S+\.\S+/.test(form.email);
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
                  <Label>Business Type / Industry Name <span className="text-destructive">*</span></Label>
                  <Input value={form.custom_business_type} onChange={(e) => set("custom_business_type", e.target.value)} placeholder="e.g. Interior Design, Consulting, Production House" autoFocus />
                  <p className="text-xs text-muted-foreground">Tell us what you do — this customises your workspace.</p>
                </div>
              )}
              <Button className="w-full h-12 mt-2" disabled={!canNext1} onClick={() => setStep(2)}>Continue</Button>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell icon={Building2} title="Business Details" subtitle="Tell us about your business.">
              <Field label="Your Name *"><Input value={form.your_name} onChange={(e) => set("your_name", e.target.value)} placeholder="Krishna Shah" autoFocus /></Field>
              <Field label="Business / Workspace Name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Krishna Shah Photography" /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone *"><Input value={form.phone} onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))} inputMode="tel" placeholder="10-digit mobile (e.g. 9876543210)" maxLength={10} /></Field>
                <Field label="Email *"><Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>
              </div>
              <div className="flex gap-2 mt-2"><Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>Back</Button><Button className="flex-1 h-12" disabled={!canNext2} onClick={() => setStep(3)}>Continue</Button></div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell icon={MapPin} title="Location & Preferences" subtitle="Where is your business based?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City *"><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Mumbai" autoFocus /></Field>
                <Field label="State *"><Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Maharashtra" /></Field>
                <Field label="Country *"><Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India" /></Field>
                <Field label="Currency"><select value={form.currency} onChange={(e) => set("currency", e.target.value)} className="w-full h-12 px-3 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">{currencies.map((c) => <option key={c} value={c.split(" ")[0]}>{c}</option>)}</select></Field>
                <Field label="Timezone" className="sm:col-span-2"><select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className="w-full h-12 px-3 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">{timezones.map((t) => <option key={t}>{t}</option>)}</select></Field>
              </div>
              <div className="flex gap-2 mt-2"><Button variant="outline" className="flex-1 h-12" onClick={() => setStep(2)}>Back</Button><Button className="flex-1 h-12" disabled={!canNext3} onClick={() => setStep(4)}>Continue</Button></div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell icon={Receipt} title="GST Registration" subtitle="Is your business GST registered?">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => set("gst_enabled", false)} className={`h-12 rounded-md border text-sm font-medium ${!form.gst_enabled ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>No</button>
                <button onClick={() => set("gst_enabled", true)} className={`h-12 rounded-md border text-sm font-medium ${form.gst_enabled ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>Yes</button>
              </div>
              {form.gst_enabled && (
                <div className="space-y-4 mt-4 animate-fade-in">
                  <Field label="GSTIN *"><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" /></Field>
                  <Field label="Registered Business Name *"><Input value={form.gst_business_name} onChange={(e) => set("gst_business_name", e.target.value)} placeholder="Krishna Shah Photography Pvt Ltd" /></Field>
                  <Field label="GST Billing Address *"><Input value={form.gst_billing_address} onChange={(e) => set("gst_billing_address", e.target.value)} placeholder="Address" /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="GST State *"><Input value={form.gst_state} onChange={(e) => set("gst_state", e.target.value)} placeholder="Maharashtra" /></Field>
                    <Field label="Default GST Rate (%)"><select value={form.default_gst_rate} onChange={(e) => set("default_gst_rate", Number(e.target.value))} className="w-full h-12 px-3 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40">{gstRates.map((r) => <option key={r} value={r}>{r}%</option>)}</select></Field>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-2"><Button variant="outline" className="flex-1 h-12" onClick={() => setStep(3)}>Back</Button><Button className="flex-1 h-12" disabled={saving || (form.gst_enabled && (!form.gstin || !form.gst_business_name || !form.gst_billing_address || !form.gst_state))} onClick={createWorkspace}>{saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>) : "Create Workspace"}</Button></div>
            </StepShell>
          )}

          {step === 5 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><PartyPopper className="w-8 h-8 text-success" /></div>
              <h2 className="text-xl font-semibold">Workspace created!</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">{form.name} is ready. You're on the Free plan — welcome to Kramasha.</p>
              <Button className="w-full h-12" disabled={entering} onClick={enterApp}>{entering ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading your workspace…</>) : "Enter Kramasha"}</Button>
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
  return (<div className={className}><Label className="mb-1.5 block">{label}</Label>{children}</div>);
}