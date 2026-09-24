import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import ServiceForm from "@/components/services/ServiceForm";
import { useToast } from "@/components/ui/use-toast";
import { loadRoles } from "@/lib/teamService";
import { loadAllServices } from "@/lib/quotationService";
import { Briefcase, Tags, Palette, Shield, CreditCard, LogOut, FileText, UserCircle, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { usePlan } from "@/hooks/usePlan";
import PreferencesSections from "@/components/preferences/PreferencesSections";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { motion } from "framer-motion";
import TabTransition from "@/components/common/TabTransition";
import { DURATION_FAST, EASE } from "@/lib/motionVariants";

const NAV_GROUPS = [
  {
    key: "general",
    label: "General",
    items: [
      { key: "profile", label: "Profile & Workspace", icon: UserCircle },
      { key: "appearance", label: "Appearance", icon: Palette },
    ],
  },
  {
    key: "business",
    label: "Business",
    items: [
      { key: "business-setup", label: "Business Setup", icon: Briefcase },
      { key: "types-display", label: "Types & Display", icon: Tags },
    ],
  },
  {
    key: "quotation",
    label: "Quotation",
    items: [
      { key: "quotation", label: "Quotation", icon: FileText },
    ],
  },
  {
    key: "app",
    label: "App",
    items: [
      { key: "data-export", label: "Data Export", icon: Download },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      { key: "security", label: "Security", icon: Shield },
      { key: "billing", label: "Billing & Plan", icon: CreditCard },
      { key: "data-deletion", label: "Data Deletion", icon: Trash2 },
      { key: "session", label: "Session", icon: LogOut },
    ],
  },
];

const GROUP_LABELS = {
  general: "General",
  business: "Business",
  quotation: "Quotation",
  app: "App",
  account: "Account",
};

export default function Preferences() {
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const { fiscalYears, selectedFY, selectFY } = useFinancialYear();
  const { plan, usage, canCreate } = usePlan();
  const isPro = plan?.planCode === "PRO";
  const [showPlanLimit, setShowPlanLimit] = useState(false);
  const [activeGroup, setActiveGroup] = useState("general");
  const [toggles, setToggles] = useState(() => {
    try {
      const prefs = workspace?.display_preferences ? JSON.parse(workspace.display_preferences) : null;
      return {
        showProgressIndicators: true,
        showMemberTypeColors: true,
        showStatusDots: true,
        showTeam: true,
        showServices: true,
        showAddressOnCards: false,
        showServicesOnCards: false,
        showLogo: false,
        ...(prefs || {}),
      };
    } catch {
      return { showProgressIndicators: true, showMemberTypeColors: true, showStatusDots: true, showTeam: true, showServices: true, showAddressOnCards: false, showServicesOnCards: false, showLogo: false };
    }
  });
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
      // Keep previous list on re-fetch error — don't wipe to empty
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
      // Keep previous list on re-fetch error — don't wipe to empty
    } finally {
      setLoadingServices(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadServicesList(); }, [loadServicesList]);

  // Optimistic update on save — immediately show the saved record, then re-fetch for consistency
  const onRoleSaved = (saved) => {
    if (saved) {
      setRoles((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
    }
    loadRolesList();
  };

  const onServiceSaved = (saved) => {
    if (saved) {
      setServiceList((prev) => {
        const idx = prev.findIndex((s) => s.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
    }
    loadServicesList();
  };

  const openAddService = () => {
    const check = canCreate("max_services");
    if (!check.allowed) {
      setShowPlanLimit(true);
      return;
    }
    setEditingService(null);
    setShowServiceForm(true);
  };
  const openEditService = (s) => { setEditingService(s); setShowServiceForm(true); };
  const toggleServiceStatus = async (s) => {
    const newStatus = s.status === "active" ? "inactive" : "active";
    setServiceList((prev) => prev.map((x) => x.id === s.id ? { ...x, status: newStatus } : x));
    try {
      await base44.entities.Service.update(s.id, { status: newStatus });
      loadServicesList();
    } catch (e) {
      setServiceList((prev) => prev.map((x) => x.id === s.id ? { ...x, status: s.status } : x));
      toast({ title: "Failed to update service", description: e?.message, variant: "destructive" });
    }
  };
  const deleteService = async (s) => {
    if (!window.confirm(`Delete service "${s.name}"? Historical quotations keep their snapshot.`)) return;
    setServiceList((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await base44.entities.Service.delete(s.id);
      toast({ title: "Service deleted" });
      loadServicesList();
    } catch (e) {
      loadServicesList();
      toast({ title: "Failed to delete service", description: e?.message, variant: "destructive" });
    }
  };

  const openAddRole = () => { setEditingRole(null); setShowRoleForm(true); };
  const openEditRole = (r) => { setEditingRole(r); setShowRoleForm(true); };
  const toggleRoleStatus = async (r) => {
    const newStatus = r.status === "active" ? "inactive" : "active";
    setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus } : x));
    try {
      await base44.entities.TeamRole.update(r.id, { status: newStatus });
      loadRolesList();
    } catch (e) {
      setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, status: r.status } : x));
      toast({ title: "Failed to update role", description: e?.message, variant: "destructive" });
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

  const activeGroupConfig = NAV_GROUPS.find((g) => g.key === activeGroup) || NAV_GROUPS[0];

  const sectionProps = {
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
    onOpenAddRole: openAddRole,
    onOpenEditRole: openEditRole,
    onToggleRoleStatus: toggleRoleStatus,
    onOpenAddService: openAddService,
    onOpenEditService: openEditService,
    onToggleServiceStatus: toggleServiceStatus,
    onDeleteService: deleteService,
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-6 space-y-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.key} className="space-y-1">
              <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeGroup === group.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveGroup(group.key)}
                    className={cn(
                      "relative w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors",
                      isActive ? "text-primary-foreground" : "text-foreground hover:bg-muted"
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-primary rounded-lg" />
                    )}
                    <Icon className="w-4 h-4 shrink-0 relative z-10" />
                    <span className="truncate relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile horizontal tab bar */}
      <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <button
            key={group.key}
            onClick={() => setActiveGroup(group.key)}
            className={cn(
              "relative shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              activeGroup === group.key ? "text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"
            )}
          >
            {activeGroup === group.key && (
              <motion.div
                layoutId="prefs-mobile-indicator"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ duration: DURATION_FAST, ease: EASE }}
              />
            )}
            <span className="relative z-10">{group.label}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-foreground">Preferences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace, business, and app settings — each section saves independently.</p>
        </div>
        <TabTransition tabKey={activeGroup} className="space-y-10">
          {activeGroupConfig.items.map((item) => (
            <div key={item.key}>
              <PreferencesSections sectionKey={item.key} {...sectionProps} />
            </div>
          ))}
        </TabTransition>
      </main>

      <TeamRoleForm
        open={showRoleForm}
        onClose={() => setShowRoleForm(false)}
        onSaved={onRoleSaved}
        role={editingRole}
        workspaceId={workspaceId}
      />

      <ServiceForm
        open={showServiceForm}
        onClose={() => setShowServiceForm(false)}
        onSaved={onServiceSaved}
        service={editingService}
        workspaceId={workspaceId}
        gstEnabled={!!workspace?.gst_enabled}
      />

      <PlanLimitDialog
        open={showPlanLimit}
        onClose={() => setShowPlanLimit(false)}
        resource="services"
        currentUsage={usage?.services || 0}
        limit={plan?.limits?.max_services || 0}
      />
    </div>
  );
}