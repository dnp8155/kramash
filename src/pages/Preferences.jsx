import { useState, useEffect, useRef } from "react";
import { Save, Building2, Bell, Palette, Receipt, Upload, Loader2, Trash2, Plus, Pencil, Users, FileText, Wallet, Share2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { toast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import ExpenseCategoryManager from "@/components/finance/ExpenseCategoryManager";
import ServiceManager from "@/components/services/ServiceManager";
import EventTypeManager from "@/components/settings/EventTypeManager";
import { formatCurrency } from "@/utils/format";
import { Image } from "@/components/ui/image";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS } from "@/lib/BusinessTerminology";

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
const CATEGORY_OPTIONS = Object.values(BUSINESS_CATEGORIES).map((v) => ({
  value: v,
  label: CATEGORY_LABELS[v],
}));

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        type="button"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function Preferences() {
  const { currentWorkspace, refresh, loading } = useWorkspace();
  const { roles, loading: rolesLoading, createRole, updateRole } = useTeamRoles();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(null);
  const [notif, setNotif] = useState({ email: true, push: false, paymentAlerts: true, eventReminders: true });
  const [appearance, setAppearance] = useState({ compact: false, animations: true });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (currentWorkspace) {
      setForm({
        name: currentWorkspace.name || "",
        business_category: currentWorkspace.business_category || BUSINESS_CATEGORIES.PHOTOGRAPHY,
        custom_business_type: currentWorkspace.custom_business_type || "",
        business_type: currentWorkspace.business_type || "",
        email: currentWorkspace.email || "",
        phone: currentWorkspace.phone || "",
        logo: currentWorkspace.logo || "",
        address: currentWorkspace.address || "",
        city: currentWorkspace.city || "",
        state: currentWorkspace.state || "",
        country: currentWorkspace.country || "India",
        currency: currentWorkspace.currency || "INR",
        timezone: currentWorkspace.timezone || "Asia/Kolkata",
        gst_enabled: !!currentWorkspace.gst_enabled,
        gstin: currentWorkspace.gstin || "",
        gst_business_name: currentWorkspace.gst_business_name || "",
        gst_billing_address: currentWorkspace.gst_billing_address || "",
        gst_state: currentWorkspace.gst_state || "",
        default_gst_rate: currentWorkspace.default_gst_rate ?? 18,
        default_quotation_terms: currentWorkspace.default_quotation_terms || "",
        event_types: currentWorkspace.event_types || [],
        event_statuses: currentWorkspace.event_statuses || [],
        bank_account_name: currentWorkspace.bank_account_name || "",
        bank_name: currentWorkspace.bank_name || "",
        bank_account_number: currentWorkspace.bank_account_number || "",
        bank_ifsc: currentWorkspace.bank_ifsc || "",
        bank_upi_id: currentWorkspace.bank_upi_id || "",
        social_instagram: currentWorkspace.social_instagram || "",
        social_website: currentWorkspace.social_website || "",
        social_youtube: currentWorkspace.social_youtube || "",
      });
    }
  }, [currentWorkspace?.id]);

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Maximum logo size is 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo", file_url);
      toast({ title: "Logo uploaded", description: "Save changes to apply." });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Workspace.update(currentWorkspace.id, {
        name: form.name.trim(),
        business_category: form.business_category,
        custom_business_type: form.business_category === BUSINESS_CATEGORIES.OTHER ? form.custom_business_type.trim() : "",
        business_type: form.business_category === BUSINESS_CATEGORIES.OTHER
          ? form.custom_business_type.trim()
          : CATEGORY_LABELS[form.business_category],
        email: form.email.trim(),
        phone: form.phone.trim(),
        logo: form.logo,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country,
        currency: form.currency,
        timezone: form.timezone,
        gst_enabled: form.gst_enabled,
        gstin: form.gst_enabled ? form.gstin.trim() : "",
        gst_business_name: form.gst_enabled ? form.gst_business_name.trim() : "",
        gst_billing_address: form.gst_enabled ? form.gst_billing_address.trim() : "",
        gst_state: form.gst_enabled ? form.gst_state.trim() : "",
        default_gst_rate: form.gst_enabled ? Number(form.default_gst_rate) : null,
        default_quotation_terms: form.default_quotation_terms || "",
        event_types: form.event_types || [],
        event_statuses: form.event_statuses || [],
        bank_account_name: form.bank_account_name.trim(),
        bank_name: form.bank_name.trim(),
        bank_account_number: form.bank_account_number.trim(),
        bank_ifsc: form.bank_ifsc.trim(),
        bank_upi_id: form.bank_upi_id.trim(),
        social_instagram: form.social_instagram.trim(),
        social_website: form.social_website.trim(),
        social_youtube: form.social_youtube.trim(),
      });
      await refresh();
      toast({ title: "Changes saved", description: "Your workspace has been updated." });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleSave = async (data) => {
    if (editingRole) {
      await updateRole(editingRole.id, data);
      toast({ title: "Role updated" });
    } else {
      await createRole(data);
      toast({ title: "Role added" });
    }
  };

  const handleRoleToggle = async (role) => {
    await updateRole(role.id, {
      status: role.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Preferences"
        description="Configure your workspace, notifications, and appearance."
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Workspace */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {form.logo ? (
                  <Image src={form.logo} alt="logo" fittingType="fill" className="h-full w-full" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {form.logo ? "Replace" : "Upload Logo"}
                </Button>
                {form.logo && (
                  <Button variant="ghost" size="sm" onClick={() => set("logo", "")}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <Input label="Business Name" value={form.name} onChange={(e) => set("name", e.target.value)} className="sm:col-span-2" />
            <Select label="Business Category" value={form.business_category} onChange={(e) => set("business_category", e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
            {form.business_category === BUSINESS_CATEGORIES.OTHER && (
              <Input
                label="Custom Business Type"
                value={form.custom_business_type}
                onChange={(e) => set("custom_business_type", e.target.value)}
                placeholder="e.g. Interior Design, Consulting"
              />
            )}
            <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            <Input label="Contact Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </CardBody>
        </Card>

        {/* Location & Preferences */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle>Location & Preferences</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <Input label="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
            <Select label="Country" value={form.country} onChange={(e) => set("country", e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select label="Currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.v} value={c.v}>{c.l}</option>
              ))}
            </Select>
            <Select label="Timezone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className="sm:col-span-2">
              {TIMEZONES.map((t) => (
                <option key={t.v} value={t.v}>{t.l}</option>
              ))}
            </Select>
          </CardBody>
        </Card>

        {/* GST */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle>GST Registration</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Toggle
              checked={form.gst_enabled}
              onChange={(v) => set("gst_enabled", v)}
              label="My business is GST registered"
              description="Enable to capture GSTIN and tax details for quotations."
            />
            {form.gst_enabled && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
                <Input label="GSTIN" value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} className="sm:col-span-2" />
                <Input label="Registered Business Name" value={form.gst_business_name} onChange={(e) => set("gst_business_name", e.target.value)} className="sm:col-span-2" />
                <Input label="GST Billing Address" value={form.gst_billing_address} onChange={(e) => set("gst_billing_address", e.target.value)} className="sm:col-span-2" />
                <Input label="GST State" value={form.gst_state} onChange={(e) => set("gst_state", e.target.value)} />
                <Select label="Default GST Rate" value={form.default_gst_rate} onChange={(e) => set("default_gst_rate", Number(e.target.value))}>
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </Select>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Bank & Payment Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <CardTitle>Bank & Payment Details</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Account Holder Name" value={form.bank_account_name} onChange={(e) => set("bank_account_name", e.target.value)} />
            <Input label="Bank Name" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
            <Input label="Account Number" value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} />
            <Input label="IFSC Code" value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase())} />
            <Input label="UPI ID" value={form.bank_upi_id} onChange={(e) => set("bank_upi_id", e.target.value)} className="sm:col-span-2" />
            <p className="text-xs text-muted-foreground sm:col-span-2">
              These details appear on the public quotation page for client payments. Only fill the fields you want to share.
            </p>
          </CardBody>
        </Card>

        {/* Social Links */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Instagram URL" value={form.social_instagram} onChange={(e) => set("social_instagram", e.target.value)} placeholder="https://instagram.com/…" />
            <Input label="Website URL" value={form.social_website} onChange={(e) => set("social_website", e.target.value)} placeholder="https://…" />
            <Input label="YouTube URL" value={form.social_youtube} onChange={(e) => set("social_youtube", e.target.value)} placeholder="https://youtube.com/@…" />
            <p className="text-xs text-muted-foreground sm:col-span-2">
              These links appear as clickable buttons on the public quotation page. Only fill the ones you want to show.
            </p>
          </CardBody>
        </Card>

        {/* Team Roles */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle>Team Roles</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingRole(null);
                setRoleModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Role
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            {rolesLoading ? (
              <LoadingState label="Loading roles…" />
            ) : roles.length === 0 ? (
              <EmptyState
                title="No roles yet"
                description="Add roles like Photographer, Editor, or Drone Operator to build your crew."
                icon={Users}
              />
            ) : (
              <div className="divide-y divide-border">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.default_rate != null
                          ? `${formatCurrency(r.default_rate)} · ${r.rate_type}`
                          : r.rate_type || "—"}
                      </p>
                    </div>
                    <StatusBadge
                      status={r.status === "active" ? "Active" : "Inactive"}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRoleToggle(r)}
                    >
                      {r.status === "active" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingRole(r);
                        setRoleModalOpen(true);
                      }}
                      title="Edit role"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Event Types & Statuses */}
        <EventTypeManager
          eventTypes={form.event_types}
          eventStatuses={form.event_statuses}
          onChange={(data) => setForm((f) => ({ ...f, ...data }))}
        />

        {/* Service Rates */}
        <ServiceManager />

        {/* Default Quotation Terms */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle>Default Quotation Terms</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              value={form.default_quotation_terms || ""}
              onChange={(e) => set("default_quotation_terms", e.target.value)}
              rows={5}
              placeholder="Default terms and conditions preloaded into new quotations (payment terms, delivery timeline, cancellation policy…)"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              These terms preload into new quotations. You can edit them per quotation.
            </p>
          </CardBody>
        </Card>

        {/* Expense Categories */}
        <ExpenseCategoryManager />

        {/* Notifications */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-border">
            <Toggle checked={notif.paymentAlerts} onChange={(v) => setNotif({ ...notif, paymentAlerts: v })} label="Payment alerts" description="In-app notification when payments are recorded" />
            <Toggle checked={notif.eventReminders} onChange={(v) => setNotif({ ...notif, eventReminders: v })} label="Event reminders" description="In-app reminders before upcoming events" />
            <Toggle checked={false} onChange={() => {}} label="Push notifications" description="Not available in Beta — requires push provider configuration" />
            <Toggle checked={false} onChange={() => {}} label="Email notifications" description="Not available in Beta — requires email service configuration" />
          </CardBody>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-border">
            <Toggle checked={appearance.compact} onChange={(v) => setAppearance({ ...appearance, compact: v })} label="Compact mode" description="Reduce spacing between elements" />
            <Toggle checked={appearance.animations} onChange={(v) => setAppearance({ ...appearance, animations: v })} label="Animations" description="Enable transitions and motion" />
          </CardBody>
        </Card>
      </div>

      <TeamRoleForm
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        role={editingRole}
        onSave={handleRoleSave}
      />
    </div>
  );
}