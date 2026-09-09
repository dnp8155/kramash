import { useState } from "react";
import { Save, Building2, Bell, Palette } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
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
  const [workspace, setWorkspace] = useState({ name: "Kramashah", email: "studio@kramashah.com", phone: "+91 98200 00000", currency: "INR", timezone: "Asia/Kolkata" });
  const [notif, setNotif] = useState({ email: true, push: false, paymentAlerts: true, eventReminders: true });
  const [appearance, setAppearance] = useState({ compact: false, animations: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Preferences"
        description="Configure your workspace, notifications, and appearance."
        actions={<Button><Save className="h-4 w-4" /> Save Changes</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /><CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Workspace Name" value={workspace.name} onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })} className="sm:col-span-2" />
            <Input label="Contact Email" value={workspace.email} onChange={(e) => setWorkspace({ ...workspace, email: e.target.value })} />
            <Input label="Phone" value={workspace.phone} onChange={(e) => setWorkspace({ ...workspace, phone: e.target.value })} />
            <Select label="Currency" value={workspace.currency} onChange={(e) => setWorkspace({ ...workspace, currency: e.target.value })}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </Select>
            <Select label="Timezone" value={workspace.timezone} onChange={(e) => setWorkspace({ ...workspace, timezone: e.target.value })}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
            </Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /><CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-border">
            <Toggle checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} label="Email notifications" description="Receive updates via email" />
            <Toggle checked={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} label="Push notifications" description="On mobile devices" />
            <Toggle checked={notif.paymentAlerts} onChange={(v) => setNotif({ ...notif, paymentAlerts: v })} label="Payment alerts" description="When payments are received" />
            <Toggle checked={notif.eventReminders} onChange={(v) => setNotif({ ...notif, eventReminders: v })} label="Event reminders" description="Before upcoming events" />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /><CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-border">
            <Toggle checked={appearance.compact} onChange={(v) => setAppearance({ ...appearance, compact: v })} label="Compact mode" description="Reduce spacing between elements" />
            <Toggle checked={appearance.animations} onChange={(v) => setAppearance({ ...appearance, animations: v })} label="Animations" description="Enable transitions and motion" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}