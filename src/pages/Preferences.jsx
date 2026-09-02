import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { businessTypes } from "@/constants/preferencesConfig";
import { formatINR } from "@/utils/format";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import WorkspaceSettings from "@/components/settings/WorkspaceSettings";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import ServiceForm from "@/components/services/ServiceForm";
import { useToast } from "@/components/ui/use-toast";
import { loadRoles } from "@/lib/teamService";
import { loadAllServices } from "@/lib/quotationService";
import { Pencil, Trash2, Plus, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportFinancialCsv } from "@/lib/exportUtils";
import { loadAllTransactions } from "@/lib/financeService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { txInFY, fyDisplayLabel } from "@/lib/financialYearService";
import { getIndustryPresets } from "@/constants/industryPresets";
import TeamMemberTypeManager from "@/components/preferences/TeamMemberTypeManager";
import EventTypeManager from "@/components/preferences/EventTypeManager";

const BUSINESS_TYPE_TO_CATEGORY = {
  "Photography": "PHOTOGRAPHY",
  "Videography": "PHOTOGRAPHY",
  "Event Management": "EVENT_MANAGEMENT",
  "Production House": "EVENT_MANAGEMENT"
};

export default function Preferences() {
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const { fiscalYears, selectedFY, selectFY } = useFinancialYear();
  const [exporting, setExporting] = useState(false);
  const [toggles, setToggles] = useState(() => {
    try {
      const prefs = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : null;
      return prefs || { showTeam: true, showServices: false, showAddress: false, showLogo: false };
    } catch {
      return { showTeam: true, showServices: false, showAddress: false, showLogo: false };
    }
  });
  const [businessType, setBusinessType] = useState(workspace?.business_type || "Photography");
  const [loadingPresets, setLoadingPresets] = useState(false);

  const changeBusinessType = async (val) => {
    setBusinessType(val);
    try {
      await base44.entities.Workspace.update(workspace.id, { business_type: val });
      toast({ title: "Business type updated" });
    } catch (e) {
      toast({ title: "Failed to update business type", description: e?.message, variant: "destructive" });
    }
  };

  const loadPresetSet = async () => {
    const category = BUSINESS_TYPE_TO_CATEGORY[businessType] || "OTHER";
    const presets = getIndustryPresets(category);
    if (presets.roles.length === 0 && presets.services.length === 0) {
      toast({ title: "No presets available for this business type" });
      return;
    }
    const existingRoleNames = new Set(roles.map((r) => r.name.toLowerCase()));
    const existingServiceNames = new Set(serviceList.map((s) => s.name.toLowerCase()));
    const newRoles = presets.roles.filter((r) => !existingRoleNames.has(r.name.toLowerCase()));
    const newServices = presets.services.filter((s) => !existingServiceNames.has(s.name.toLowerCase()));
    const skippedRoles = presets.roles.length - newRoles.length;
    const skippedServices = presets.services.length - newServices.length;
    if (newRoles.length === 0 && newServices.length === 0) {
      toast({ title: "All presets already exist", description: "No new roles or services to add." });
      return;
    }
    if (!window.confirm(`Add ${newRoles.length} roles and ${newServices.length} services for ${businessType}?${skippedRoles + skippedServices > 0 ? `\n(${skippedRoles + skippedServices} already exist — will be skipped)` : ""}`)) return;
    setLoadingPresets(true);
    try {
      for (const r of newRoles) {
        await base44.entities.TeamRole.create({
          workspace_id: workspaceId,
          name: r.name,
          default_rate: r.default_rate,
          rate_type: r.rate_type,
          status: "active"
        });
      }
      for (const s of newServices) {
        await base44.entities.Service.create({
          workspace_id: workspaceId,
          name: s.name,
          default_rate: s.default_rate,
          rate_type: s.rate_type,
          gst_rate: s.gst_rate || 0,
          status: "active"
        });
      }
      toast({ title: "Preset loaded", description: `${newRoles.length} roles and ${newServices.length} services added.` });
      loadRolesList();
      loadServicesList();
    } catch (e) {
      toast({ title: "Failed to load presets", description: e?.message, variant: "destructive" });
    } finally {
      setLoadingPresets(false);
    }
  };

  // Team Roles (real backend)
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Services (real backend)
  const [serviceList, setServiceList] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

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

  const loadServicesList = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingServices(true);
    try {
      setServiceList(await loadAllServices(workspaceId));
    } catch (e) {
      setServiceList([]);
    } finally {
      setLoadingServices(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadServicesList(); }, [loadServicesList]);

  const openAddService = () => { setEditingService(null); setShowServiceForm(true); };
  const openEditService = (s) => { setEditingService(s); setShowServiceForm(true); };
  const toggleServiceStatus = async (s) => {
    try {
      await base44.entities.Service.update(s.id, { status: s.status === "active" ? "inactive" : "active" });
      loadServicesList();
    } catch (e) {
      toast({ title: "Failed to update service", description: e?.message, variant: "destructive" });
    }
  };
  const deleteService = async (s) => {
    if (!window.confirm(`Delete service "${s.name}"? Historical quotations keep their snapshot.`)) return;
    try {
      await base44.entities.Service.delete(s.id);
      toast({ title: "Service deleted" });
      loadServicesList();
    } catch (e) {
      toast({ title: "Failed to delete service", description: e?.message, variant: "destructive" });
    }
  };

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

  const setT = (key) => async (v) => {
    const next = { ...toggles, [key]: v };
    setToggles(next);
    try {
      await base44.entities.Workspace.update(workspace.id, { display_preferences: JSON.stringify(next) });
    } catch (e) {
      toast({ title: "Failed to save preference", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1200px] mx-auto">
      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Owner & workspace (live) */}
        <WorkspaceSettings />
      </div>

      {/* Business type */}
      <Card title="Business Type">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <Field label="Business Type" className="flex-1">
            <Select value={businessType} onChange={(e) => changeBusinessType(e.target.value)}>
              {businessTypes.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </Field>
          <Button onClick={loadPresetSet} disabled={loadingPresets}>
            {loadingPresets ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</> : "Load Set"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Load starter roles and services for the selected business type. Existing items with the same name are skipped.</p>
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
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === "active" ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
                  <span className={cn("text-sm flex-1 min-w-0 truncate", r.status === "inactive" && "text-muted-foreground line-through")}>{r.name}</span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{formatINR(r.default_rate)}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">{r.rate_type}</span>
                  <button onClick={() => openEditRole(r)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Edit role">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleRoleStatus(r)} className="text-muted-foreground hover:text-warning shrink-0" aria-label="Toggle status" title={r.status === "active" ? "Disable" : "Enable"}>
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
            {loadingServices ? (
              <p className="text-sm text-muted-foreground py-2">Loading services…</p>
            ) : serviceList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No services yet. Add one to get started.</p>
            ) : (
              serviceList.map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === "active" ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
                  <span className={cn("text-sm flex-1 min-w-0 truncate", s.status === "inactive" && "text-muted-foreground line-through")}>{s.name}</span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{formatINR(s.default_rate)}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">{s.rate_type}</span>
                  {workspace?.gst_enabled && Number(s.gst_rate) > 0 && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">GST {s.gst_rate}%</span>
                  )}
                  <button onClick={() => openEditService(s)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Edit service">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleServiceStatus(s)} className="text-muted-foreground hover:text-warning shrink-0" aria-label="Toggle status" title={s.status === "active" ? "Disable" : "Enable"}>
                    {s.status === "active" ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteService(s)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete service">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <Button variant="dark" size="sm" className="mt-3" onClick={openAddService}><Plus className="w-3.5 h-3.5" />Add Service</Button>
        </Card>
      </div>

      {/* Member types, event types & display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Team Member Types">
          <TeamMemberTypeManager workspace={workspace} />
        </Card>
        <Card title="Event / Work Types">
          <EventTypeManager workspace={workspace} />
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
          <Field label="Financial year" className="mb-3">
            <Select value={selectedFY?.id || ""} onChange={(e) => selectFY(e.target.value)}>
              {fiscalYears.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </Select>
          </Field>
          <Button variant="outline" size="sm" disabled={exporting} onClick={async () => {
            setExporting(true);
            try {
              const tx = await loadAllTransactions(workspaceId);
              const events = await base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500);
              const clients = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500);
              const members = await base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500);
              const eventsById = {}, clientsById = {}, membersById = {};
              events.forEach((e) => { eventsById[e.id] = e; });
              clients.forEach((c) => { clientsById[c.id] = c; });
              members.forEach((m) => { membersById[m.id] = m; });
              const fyTx = tx.filter((t) => txInFY(t, selectedFY));
              if (fyTx.length === 0) {
                toast({ title: "No transactions found for this period." });
              } else {
                exportFinancialCsv(fyTx, { eventsById, clientsById, membersById }, workspace?.currency || "INR", fyDisplayLabel(selectedFY));
                toast({ title: "Export ready", description: `${fyTx.length} transactions exported.` });
              }
            } catch (e) {
              toast({ title: "Export failed", description: e?.message, variant: "destructive" });
            } finally {
              setExporting(false);
            }
          }}>
            {exporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</> : <><Download className="w-3.5 h-3.5" /> Export to Excel</>}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Exports financial activity for the selected year. Event, client, and team exports are available on their respective pages.</p>
        </Card>
      </div>

      <TeamRoleForm
        open={showRoleForm}
        onClose={() => setShowRoleForm(false)}
        onSaved={loadRolesList}
        role={editingRole}
        workspaceId={workspaceId}
      />

      <ServiceForm
        open={showServiceForm}
        onClose={() => setShowServiceForm(false)}
        onSaved={loadServicesList}
        service={editingService}
        workspaceId={workspaceId}
        gstEnabled={!!workspace?.gst_enabled}
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