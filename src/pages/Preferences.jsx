import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { services, teamMemberTypes, themes, businessTypes } from "@/data/mockPreferences";
import { formatINR } from "@/utils/format";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import WorkspaceSettings from "@/components/settings/WorkspaceSettings";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { loadRoles } from "@/lib/teamService";
import { Pencil, Trash2, ArrowUp, ArrowDown, Plus, LogOut, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Preferences() {
  const { logout } = useAuth();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [theme, setTheme] = useState("Contact Sheet");
  const [toggles, setToggles] = useState({
    statusDots: true,
    groupUpcoming: true,
    eventStatus: true,
    menubarLabels: true,
    showTeam: true,
    showServices: false,
    showAddress: false,
    showLogo: false
  });
  const [businessType, setBusinessType] = useState("Photography");

  // Team Roles (real backend)
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const loadRolesList = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingRoles(true);
    try {
      setRoles(await loadRoles(workspaceId));
    } catch (e) {
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadRolesList(); }, [loadRolesList]);

  const openAddRole = () => { setEditingRole(null); setShowRoleForm(true); };
  const openEditRole = (r) => { setEditingRole(r); setShowRoleForm(true); };
  const toggleRoleStatus = async (r) => {
    try {
      await base44.entities.TeamRole.update(r.id, { status: r.status === "active" ? "inactive" : "active" });
      loadRolesList();
    } catch (e) {
      toast({ title: "Failed to update role", description: e?.message, variant: "destructive" });
    }
  };
  const deleteRole = async (r) => {
    try {
      await base44.entities.TeamRole.delete(r.id);
      toast({ title: "Role deleted" });
      loadRolesList();
    } catch (e) {
      toast({ title: "Failed to delete role", description: e?.message, variant: "destructive" });
    }
  };

  const setT = (key) => (v) => setToggles((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1200px] mx-auto">
      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Owner & workspace (live) */}
        <WorkspaceSettings />

        {/* Appearance */}
        <Card title="Appearance">
          <Field label="Theme">
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm border transition-colors",
                    theme === t ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <div className="space-y-3 mt-3">
            <ToggleRow label="Show status dots" checked={toggles.statusDots} onChange={setT("statusDots")} />
            <ToggleRow label="Group upcoming events" checked={toggles.groupUpcoming} onChange={setT("groupUpcoming")} />
            <ToggleRow label="Show event status" checked={toggles.eventStatus} onChange={setT("eventStatus")} />
            <ToggleRow label="Show menubar labels" checked={toggles.menubarLabels} onChange={setT("menubarLabels")} />
          </div>
          <Button variant="outline" size="sm" className="mt-4">Re-run first-time setup</Button>
        </Card>
      </div>

      {/* Business type */}
      <Card title="Business Type">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <Field label="Business Type" className="flex-1">
            <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              {businessTypes.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </Field>
          <Button>Load Set</Button>
        </div>
      </Card>

      {/* Roles & services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Team Roles">
          <div className="space-y-2">
            {loadingRoles ? (
              <p className="text-sm text-muted-foreground py-2">Loading roles…</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No roles yet. Add one to get started.</p>
            ) : (
              roles.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40">
                  <span className={`w-2 h-2 rounded-full ${r.status === "active" ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
                  <span className={cn("text-sm flex-1", r.status === "inactive" && "text-muted-foreground line-through")}>{r.name}</span>
                  <span className="text-sm text-muted-foreground">{formatINR(r.default_rate)}</span>
                  <span className="text-[10px] text-muted-foreground">{r.rate_type}</span>
                  <button onClick={() => openEditRole(r)} className="text-muted-foreground hover:text-foreground" aria-label="Edit role">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleRoleStatus(r)} className="text-muted-foreground hover:text-warning" aria-label="Toggle status" title={r.status === "active" ? "Disable" : "Enable"}>
                    {r.status === "active" ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))
            )}
          </div>
          <Button variant="dark" size="sm" className="mt-3" onClick={openAddRole}><Plus className="w-3.5 h-3.5" />Add Role</Button>
        </Card>
        <Card title="Services">
          <div className="space-y-2">
            {services.map((s) => (
              <ReorderRow key={s.id} title={s.title} value={formatINR(s.price)} />
            ))}
          </div>
          <Button variant="dark" size="sm" className="mt-3"><Plus className="w-3.5 h-3.5" />Add Service</Button>
        </Card>
      </div>

      {/* Member types & display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Team Member Types">
          <div className="flex flex-wrap gap-2">
            {teamMemberTypes.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm" style={{ backgroundColor: m.color + "20", color: m.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                {m.title}
                <Pencil className="w-3 h-3" />
                <Trash2 className="w-3 h-3" />
              </span>
            ))}
          </div>
        </Card>
        <Card title="Card & Table Display">
          <div className="space-y-3">
            <ToggleRow label="Show team members" checked={toggles.showTeam} onChange={setT("showTeam")} />
            <ToggleRow label="Show services" checked={toggles.showServices} onChange={setT("showServices")} />
            <ToggleRow label="Show address & venue" checked={toggles.showAddress} onChange={setT("showAddress")} />
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm font-semibold mb-2">Shared Invoice</div>
            <ToggleRow label="Show logo on invoice" checked={toggles.showLogo} onChange={setT("showLogo")} />
          </div>
        </Card>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Export">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <Field label="Financial year" className="flex-1">
              <Select><option>April 2026 - March 2027</option></Select>
            </Field>
            <Field label="Team member" className="flex-1">
              <Select><option>All members</option></Select>
            </Field>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button variant="outline">Export to Excel</Button>
            <ProBadge />
          </div>
        </Card>
        <Card title="Notifications">
          <p className="text-sm text-muted-foreground">Payment & event reminders are a Pro feature.</p>
          <div className="flex items-center gap-3 mt-3">
            <Button>Enable</Button>
            <ProBadge />
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="text-sm font-semibold">Session</div>
            <Button variant="destructive" onClick={() => logout(true)}><LogOut className="w-4 h-4" />Log out</Button>
            <div className="text-sm font-semibold mt-3">Reset data</div>
            <div className="flex items-center gap-3">
              <Select className="flex-1"><option>All data</option><option>Events only</option></Select>
              <Button variant="destructive" disabled>Delete events…</Button>
            </div>
          </div>
        </Card>
      </div>

      <TeamRoleForm
        open={showRoleForm}
        onClose={() => setShowRoleForm(false)}
        onSaved={loadRolesList}
        role={editingRole}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
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

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function ReorderRow({ title, value }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40">
      <div className="flex flex-col text-muted-foreground">
        <ArrowUp className="w-3 h-3" />
        <ArrowDown className="w-3 h-3" />
      </div>
      <span className="text-sm text-foreground flex-1">{title}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
    </div>
  );
}

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide">
      <Crown className="w-3 h-3" />Pro
    </span>
  );
}