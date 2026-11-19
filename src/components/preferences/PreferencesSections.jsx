import { useNavigate } from "react-router-dom";
import ProTag from "@/components/common/ProTag";
import { formatINR } from "@/utils/format";
import Button from "@/components/common/Button";
import Toggle from "@/components/common/Toggle";
import ProfileWorkspaceSection from "@/components/settings/ProfileWorkspaceSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import BillingSection from "@/components/settings/BillingSection";
import SessionSection from "@/components/settings/SessionSection";
import NotificationSection from "@/components/settings/NotificationSection";
import QuotationDefaultsSection from "@/components/settings/QuotationDefaultsSection";
import SecuritySection from "@/components/settings/SecuritySection";
import DataDeletionSection from "@/components/settings/DataDeletionSection";
import TeamMemberTypeManager from "@/components/preferences/TeamMemberTypeManager";
import EventTypeManager from "@/components/preferences/EventTypeManager";
import MilestoneTemplateManager from "@/components/preferences/MilestoneTemplateManager";
import AccessibilitySection from "@/components/settings/AccessibilitySection";
import LanguageSection from "@/components/settings/LanguageSection";
import PackageSection from "@/components/preferences/PackageSection";
import TrackStatusNames from "@/components/preferences/TrackStatusNames";
import TrackDueRules from "@/components/preferences/TrackDueRules";
import { invoiceLogoOn, receiptLogoDefault } from "@/lib/logoPrefs";
import { useFeatureGate } from "@/components/common/ProGate";
import { Pencil, Trash2, Plus, Briefcase, Tags, Palette, Shield, CreditCard, LogOut, FileText, Users, UserCircle, Power, Bell, ALargeSmall, Plug, ArrowLeftRight } from "lucide-react";
import ConnectionsSection from "@/components/settings/ConnectionsSection";
import { cn } from "@/lib/utils";
import PlanLimitBanner from "@/components/common/PlanLimitBanner";

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
  onOpenAddRole,
  onOpenEditRole,
  onToggleRoleStatus,
  onDeleteRole,
  onOpenAddService,
  onOpenEditService,
  onToggleServiceStatus,
  onDeleteService,
}) {
  const navigate = useNavigate();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();
  // Tapping a dimmed Pro option explains the Pro plan (the upgrade dialog).
  const askUpgrade = (key, label) => () => checkFeature(key, label);

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
                {loadingRoles && roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Loading roles…</p>
                ) : roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No roles yet. Add one to get started.</p>
                ) : (
                  roles.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40">
                      <Users className={cn("w-3.5 h-3.5 shrink-0", r.status === "active" ? "text-success" : "text-destructive")} />
                      <span className={cn("text-sm flex-1 min-w-0 truncate", r.status === "inactive" && "text-muted-foreground line-through")}>{r.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 flex flex-col items-end sm:flex-row sm:items-baseline sm:gap-1">
                        <span className="whitespace-nowrap">{formatINR(r.default_rate)}</span>
                        <span className="text-[10px] whitespace-nowrap">/ {r.rate_type}</span>
                      </span>
                      <button onClick={() => onOpenEditRole(r)} className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Edit role">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onToggleRoleStatus(r)} className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-warning transition-colors shrink-0" aria-label="Toggle status" title={r.status === "active" ? "Disable" : "Enable"}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteRole(r)} className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive transition-colors shrink-0" aria-label="Delete role">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button variant="primary" size="sm" className="mt-3" onClick={onOpenAddRole}><Plus className="w-3.5 h-3.5" />Add Role</Button>
            </Card>
            <Card title="Services">
              <div className="mb-3"><PlanLimitBanner limitKey="max_services" usageKey="services" noun="services used" /></div>
              <div className="space-y-2">
                {loadingServices && serviceList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Loading services…</p>
                ) : serviceList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No services yet. Add one to get started.</p>
                ) : (
                  serviceList.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40">
                      <Briefcase className={cn("w-3.5 h-3.5 shrink-0", s.status === "active" ? "text-success" : "text-destructive")} />
                      <span className={cn("text-sm flex-1 min-w-0 truncate", s.status === "inactive" && "text-muted-foreground line-through")}>{s.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 flex flex-col items-end sm:flex-row sm:items-baseline sm:gap-1">
                        <span className="whitespace-nowrap">{formatINR(s.default_rate)}</span>
                        <span className="text-[10px] whitespace-nowrap">/ {s.rate_type}</span>
                      </span>
                      {workspace?.gst_enabled && Number(s.gst_rate) > 0 && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">GST {s.gst_rate}%</span>
                      )}
                      <button onClick={() => onOpenEditService(s)} className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Edit service">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onToggleServiceStatus(s)} className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-warning transition-colors shrink-0" aria-label="Toggle status" title={s.status === "active" ? "Disable" : "Enable"}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteService(s)} className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive transition-colors shrink-0" aria-label="Delete service">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button variant="primary" size="sm" className="mt-3" onClick={onOpenAddService}><Plus className="w-3.5 h-3.5" />Add Service</Button>
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
            <Card title={<span className="inline-flex items-center gap-2">Language <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">Beta</span></span>}>
              <LanguageSection />
            </Card>
            <Card title={<span className="inline-flex items-center gap-2">Event Display{!isPro && <ProTag />}</span>}>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">Control what appears on event detail pages, cards, and table rows.</p>
              <div className="space-y-3">
                <ToggleRow label="Show team members" hint="Display assigned team on event cards and table rows" checked={toggles.showTeam} onChange={setT("showTeam")} disabled={!isPro} onLocked={askUpgrade("event_display_customization_enabled", "Event Display")} />
                <ToggleRow label="Show services" hint="Display assigned services on event cards and table rows" checked={toggles.showServices} onChange={setT("showServices")} disabled={!isPro} onLocked={askUpgrade("event_display_customization_enabled", "Event Display")} />
                <ToggleRow
                  label="Show notes/description on cards"
                  hint="Display notes and description on event cards and table rows"
                  checked={isPro && toggles.showAddressOnCards}
                  onChange={setT("showAddressOnCards")}
                  disabled={!isPro} onLocked={askUpgrade("event_display_customization_enabled", "Event Display")}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-semibold mb-1 flex items-center gap-2">Shared Logo{!isPro && <ProTag />}</div>
                <p className="text-xs text-muted-foreground mb-3">Show your logo on what you share with clients. It is the same logo everywhere, set on My Profile.</p>
                <div className="space-y-3">
                  <ToggleRow label="Invoices" hint="On the invoice PDF and the invoice link you share" checked={isPro && invoiceLogoOn(toggles)} onChange={setT("showLogoOnInvoice")} disabled={!isPro} onLocked={askUpgrade("event_display_customization_enabled", "Event Display")} />
                  <ToggleRow label="Receipts" hint="Starting choice when you share a receipt from the payments tab or Financial page. You can still change it on each receipt" checked={isPro && receiptLogoDefault(toggles)} onChange={setT("showLogo")} disabled={!isPro} onLocked={askUpgrade("event_display_customization_enabled", "Event Display")} />
                </div>
              </div>
            </Card>
            <Card title={<span className="inline-flex items-center gap-2">Track{!isPro && <ProTag />}</span>}>
              <p className="text-xs text-muted-foreground mb-3">Keep a list of what you are working on for each client, with a quantity and a status. Sharing it with clients is part of the portals, so it is a Pro feature.</p>
              <div className="space-y-4">
                <ToggleRow label="Show Track tab" hint="Show the Track tab on event pages. Turn off if you don't use it" checked={toggles.showTrackTab !== false} onChange={setT("showTrackTab")} />
                <TrackStatusNames names={toggles.trackStatusNames} onSave={setT("trackStatusNames")} disabled={!isPro} onLocked={askUpgrade("client_portal_enabled", "Track")} />
                <TrackDueRules value={toggles.trackDueRules} onSave={setT("trackDueRules")} disabled={!isPro} onLocked={askUpgrade("client_portal_enabled", "Track")} />
              </div>
            </Card>
            {FeatureGateDialog}
          </div>
        </SectionBlock>
      );
    case "quotation":
      return (
        <SectionBlock icon={FileText} title="Quotation">
          <div className="space-y-4">
            <QuotationDefaultsSection />
            <MilestoneTemplateManager />
            <div className="bg-card border border-border rounded-[15px] p-4">
              <h3 className="text-sm font-semibold mb-1">Packages</h3>
              <p className="text-xs text-muted-foreground mb-3">Ready-made sets of items with prices. Add one here, then use it in a quotation or share it with a client as an image.</p>
              <PackageSection workspaceId={workspaceId} currency={workspace?.currency || "INR"} workspace={workspace} />
            </div>
          </div>
        </SectionBlock>
      );

    case "accessibility":
      return (
        <SectionBlock icon={ALargeSmall} title="Accessibility">
          <AccessibilitySection />
        </SectionBlock>
      );
    case "data-export":
      return (
        <SectionBlock icon={ArrowLeftRight} title="Import & Export">
          <div className="bg-card border border-border rounded-[15px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><ArrowLeftRight className="w-4 h-4 text-primary" /> Your data</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Download your clients, events and payments as JSON, CSV or Excel, or import a file. It is all on one page, with one range picker.</p>
              </div>
              <Button size="sm" className="shrink-0" onClick={() => navigate("/data-files")}><ArrowLeftRight className="w-4 h-4" /> Open Import &amp; Export</Button>
            </div>
          </div>
        </SectionBlock>
      );
    case "connections":
      return (
        <SectionBlock icon={Plug} title="Connections">
          <ConnectionsSection />
        </SectionBlock>
      );
    case "security":
      return (
        <SectionBlock icon={Shield} title="Security">
          <SecuritySection />
        </SectionBlock>
      );
    case "notifications":
      return (
        <SectionBlock icon={Bell} title="Notifications">
          <NotificationSection />
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
    <div className="bg-card border border-border rounded-[15px] p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}


// A disabled row is a Pro option on the Free plan: dimmed and not clickable (the section heading carries the Pro tag).
function ToggleRow({ label, hint, checked, onChange, disabled, onLocked }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", disabled && "opacity-60", disabled && onLocked && "cursor-pointer")} onClick={disabled ? onLocked : undefined}>
      <div className={cn("min-w-0", disabled && "pointer-events-none")}>
        <span className="text-sm text-foreground block">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} className={disabled ? "pointer-events-none" : undefined} />
    </div>
  );
}