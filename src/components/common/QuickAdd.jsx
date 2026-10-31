// Quick-add dialogs (team member, team role, service, event/work types) that can be opened
// from anywhere — the setup banner, Rate Estimator, Event details — without leaving the page.
// Usage: const { open, dialogs } = useQuickAdd({ onChanged }); open("team"); ... {dialogs}
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import { useT } from "@/hooks/useT";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { getDefaultEventTypes } from "@/lib/eventTypeService";
import { toast } from "@/components/ui/use-toast";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import ServiceForm from "@/components/services/ServiceForm";
import EventTypeManager from "@/components/preferences/EventTypeManager";

const LIMITS = {
  team: { key: "max_team_members", resource: "team members", usage: "team_members" },
  service: { key: "max_services", resource: "services", usage: "services" }
};

export function useQuickAdd({ onChanged } = {}) {
  const t = useT();
  const queryClient = useQueryClient();
  const term = useBusinessTerminology();
  const { workspace, workspaceId, setWorkspace } = useWorkspace();
  const { plan, usage, canCreate, reload } = usePlan();
  const [active, setActive] = useState(null); // "team" | "role" | "service" | "types"
  const [limit, setLimit] = useState(null); // LIMITS entry when the plan cap blocks an add

  const open = useCallback((kind) => {
    const cap = LIMITS[kind];
    if (cap && !canCreate(cap.key).allowed) { setLimit(cap); return; }
    setActive(kind);
  }, [canCreate]);

  const close = () => setActive(null);

  const changed = (entities, saved) => {
    invalidateEntities(queryClient, entities);
    reload();
    onChanged?.(active, saved);
  };

  // Event types only count as "set" once saved; persist the shown defaults when the user confirms them.
  const [savingTypes, setSavingTypes] = useState(false);
  const finishTypes = async () => {
    if (!workspace?.event_types && workspace?.id) {
      setSavingTypes(true);
      try {
        const defaults = JSON.stringify(getDefaultEventTypes(workspace.business_category));
        await base44.entities.Workspace.update(workspace.id, { event_types: defaults });
        setWorkspace((w) => (w ? { ...w, event_types: defaults } : w));
      } catch (e) {
        toast({ title: t("Failed to save"), description: e?.message, variant: "destructive" });
        setSavingTypes(false);
        return;
      }
      setSavingTypes(false);
    }
    onChanged?.("types");
    close();
  };

  const dialogs = (
    <>
      <TeamMemberForm
        open={active === "team"}
        onClose={close}
        onSaved={(saved) => changed(["TeamMember"], saved)}
        workspaceId={workspaceId}
      />
      <TeamRoleForm
        open={active === "role"}
        onClose={close}
        onSaved={(saved) => changed(["TeamRole"], saved)}
        workspaceId={workspaceId}
      />
      <ServiceForm
        open={active === "service"}
        onClose={close}
        onSaved={(saved, opts) => { if (!opts?.optimistic) changed(["Service"], saved); }}
        workspaceId={workspaceId}
        gstEnabled={!!workspace?.gst_enabled}
      />
      <AppDialog open={active === "types"} onOpenChange={(o) => !o && close()}>
        <AppDialogContent maxWidth="max-w-md">
          <AppDialogHeader>
            <AppDialogTitle>{term.workItemSingular} {t("types")}</AppDialogTitle>
            <AppDialogDescription>
              {t("Choose the kinds of {items} you handle.").replace("{items}", term.workItemPlural.toLowerCase())}
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody>
            <EventTypeManager workspace={workspace} />
          </AppDialogBody>
          <AppDialogFooter>
            <Button type="button" onClick={finishTypes} disabled={savingTypes}>{savingTypes ? t("Saving…") : t("Done")}</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
      <PlanLimitDialog
        open={!!limit}
        onClose={() => setLimit(null)}
        resource={limit?.resource}
        currentUsage={limit ? usage?.[limit.usage] || 0 : 0}
        limit={limit ? plan?.limits?.[limit.key] || 0 : 0}
      />
    </>
  );

  return { open, dialogs };
}
