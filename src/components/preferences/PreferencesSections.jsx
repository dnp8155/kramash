import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { formatINR } from "@/utils/format";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import ProfileWorkspaceSection from "@/components/settings/ProfileWorkspaceSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import BillingSection from "@/components/settings/BillingSection";
import SessionSection from "@/components/settings/SessionSection";
import QuotationDefaultsSection from "@/components/settings/QuotationDefaultsSection";
import SecuritySection from "@/components/settings/SecuritySection";
import DataDeletionSection from "@/components/settings/DataDeletionSection";
import TeamMemberTypeManager from "@/components/preferences/TeamMemberTypeManager";
import EventTypeManager from "@/components/preferences/EventTypeManager";
import MilestoneTemplateManager from "@/components/preferences/MilestoneTemplateManager";
import LanguageSection from "@/components/settings/LanguageSection";
import PackageSection from "@/components/preferences/PackageSection";
import { useToast } from "@/components/ui/use-toast";
import { loadAllTransactions } from "@/lib/financeService";
import { txInFY, fyDisplayLabel } from "@/lib/financialYearService";
import { exportFinancialXlsx } from "@/lib/exportUtils";
import { Pencil, Trash2, Plus, Download, Loader2, Briefcase, Tags, Palette, Shield, CreditCard, LogOut, FileText, Users, UserCircle, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PreferencesSections({
  sectionKey,
  workspace,
  workspaceId,
  toggles,
  setT,
  isPro,
  roles,
  loadingRoles,
  serviceList,
  loadingServices,
  fiscalYears,
  selectedFY,
  selectFY,
  onOpenAddRole,
  onOpenEditRole,
  onToggleRoleStatus,
  onOpenAddService,
  onOpenEditService,
  onToggleServiceStatus,
  onDeleteService,
}) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  switch (sectionKey) {
    case "profile":
      return (
        <SectionBlock icon={UserCircle} title="Profile & Workspace">
          <ProfileWorkspaceSection />
        </SectionBlock>
      );
    case "appearance":
      return (
        <SectionBlock icon={Palette} title="Appearance">
          <AppearanceSection />
        </SectionBlock>
      );
    case "business-setup":
      return (
        <SectionBlock icon={Briefcase} title="Business Setup">
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
                      <Users className={cn("w-3.5 h-3.5 shrink-0", r.status === "active" ? "text-success" : "text-destructive")} />
                      <span className={cn("text-sm flex-1 min-w-0 truncate", r.status === "inactive" && "text-muted-foreground line-through")}>{r.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatINR(r.default_rate)} <span className="text-[10px]">/ {r.rate_type}</span>
                      </span>
                      <button onClick={() => onOpenEditRole(r)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Edit role">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onToggleRoleStatus(r)} className="text-muted-foreground hover:text-warning shrink-0" aria-label="Toggle status" title={r.status === "active" ? "Disable" : "Enable"}>
                        {r.status === "active" ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button variant="dark" size="sm" className="mt-3" onClick={onOpenAddRole}><Plus className="w-3.5 h-3.5" />Add Role</Button>
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
                      <Briefcase className={cn("w-3.5 h-3.5 shrink-0", s.status === "active" ? "text-success" : "text-destructive")} />
                      <span className={cn("text-sm flex-1 min-w-0 truncate", s.status === "inactive" && "text-muted-foreground line-through")}>{s.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatINR(s.default_rate)} <span className="text-[10px]">/ {s.rate_type}</span>
                      </span>
                      {workspace?.gst_enabled && Number(s.gst_rate) > 0 && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">GST {s.gst_rate}%</span>
                      )}
                      <button onClick={() => onOpenEditService(s)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Edit service">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onToggleServiceStatus(s)} className="text-muted-foreground hover:text-warning shrink-0" aria-label="Toggle status" title={s.status === "active" ? "Disable" : "Enable"}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteService(s)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete service">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button variant="dark" size="sm" className="mt-3" onClick={onOpenAddService}><Plus className="w-3.5 h-3.5" />Add Service</Button>
            </Card>
          </div>
        </SectionBlock>
      );
    case "types-display":
      return (
        <SectionBlock icon={Tags} title="Types & Display">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Team Member Types">
              <TeamMemberTypeManager workspace={workspace} />
            </Card>
            <Card title="Event / Work Types">
              <EventTypeManager workspace={workspace} />
            </Card>
            <Card title="Language">
              <LanguageSection />
            </Card>
            <Card title="Event Display">
              <p className="text-xs text-muted-foreground mb-3">Control what appears on event detail pages, cards, and table rows.</p>
              <div className="space-y-3">
                <ToggleRow label="Show team members" hint="Display assigned team on event cards and table rows" checked={toggles.showTeam} onChange={setT("showTeam")} />
                <ToggleRow label="Show services" hint="Display assigned services on event cards and table rows" checked={toggles.showServices} onChange={setT("showServices")} />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Pro-only</span>
                  {!isPro && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Pro</span>
                  )}
                </div>
                <ToggleRow
                  label="Show notes/description on cards"
                  hint="Display notes and description on event cards and table rows"
                  checked={isPro && toggles.showAddressOnCards}
                  onChange={setT("showAddressOnCards")}
                  disabled={!isPro}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-semibold mb-2">Shared Invoice</div>
                <ToggleRow label="Show logo on invoice" checked={toggles.showLogo} onChange={setT("showLogo")} />
              </div>
            </Card>
          </div>
        </SectionBlock>
      );
    case "quotation":
      return (
        <SectionBlock icon={FileText} title="Quotation">
          <div className="space-y-4">
            <QuotationDefaultsSection />
            <MilestoneTemplateManager />
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-1">Packages</h3>
              <p className="text-xs text-muted-foreground mb-3">Reusable quotation templates. Create them from the Quotation Editor ("Save as Package"), then manage their details here.</p>
              <PackageSection workspaceId={workspaceId} currency={workspace?.currency || "INR"} />
            </div>
          </div>
        </SectionBlock>
      );

    case "data-export":
      return (
        <SectionBlock icon={Download} title="Data Export">
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
                  exportFinancialXlsx(fyTx, { eventsById, clientsById, membersById }, workspace?.currency || "INR", fyDisplayLabel(selectedFY));
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
        </SectionBlock>
      );
    case "security":
      return (
        <SectionBlock icon={Shield} title="Security">
          <SecuritySection />
        </SectionBlock>
      );
    case "billing":
      return (
        <SectionBlock icon={CreditCard} title="Billing & Plan">
          <BillingSection />
        </SectionBlock>
      );
    case "data-deletion":
      return (
        <SectionBlock icon={Trash2} title="Data Deletion">
          <DataDeletionSection />
        </SectionBlock>
      );
    case "session":
      return (
        <SectionBlock icon={LogOut} title="Session">
          <SessionSection />
        </SectionBlock>
      );
    default:
      return null;
  }
}

function SectionBlock({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
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

function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", disabled && "opacity-50")}>
      <div className="min-w-0">
        <span className="text-sm text-foreground block">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}