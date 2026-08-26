import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { teamMemberTypes, businessTypes } from "@/constants/preferencesConfig";
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
import { Pencil, Trash2, ArrowUp, ArrowDown, Plus, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportFinancialCsv } from "@/lib/exportUtils";
import { loadAllTransactions } from "@/lib/financeService";
import { financialYearLabels, currentFinancialYearLabel } from "@/constants/financeConfig";

export default function Preferences() {
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const [exportFy, setExportFy] = useState(currentFinancialYearLabel());
  const [exporting, setExporting] = useState(false);
  const [toggles, setToggles] = useState({
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

  const setT = (key) => (v) => setToggles((prev) => ({ ...prev, [key]: v }));

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
          <Field label="Financial year" className="mb-3">
            <Select value={exportFy} onChange={(e) => setExportFy(e.target.value)}>
              {financialYearLabels(6).map((l) => (
                <option key={l} value={l}>{l.replace("FY ", "April ")} - March {("20" + l.split("-")[1])}</option>
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
              const { fyLabelForDate } = await import("@/constants/financeConfig");
              const fyTx = tx.filter((t) => fyLabelForDate(t.transaction_date) === exportFy);
              if (fyTx.length === 0) {
                toast({ title: "No transactions found for this period." });
              } else {
                exportFinancialCsv(fyTx, { eventsById, clientsById, membersById }, workspace?.currency || "INR", exportFy);
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