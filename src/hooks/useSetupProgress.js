// Workspace setup checklist state, shared by the Events banner and Preferences.
// Wording follows the workspace's business type (an architect sees "Add team" with
// architect roles and "Project types", not photographers and shoots).
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadRoles } from "@/lib/teamService";
import { useT, useLang } from "@/hooks/useT";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/hooks/usePlan";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { getProfile } from "@/lib/businessTypeProfiles";
import { resolveBusinessCategory } from "@/lib/businessTerminology";

const dismissKey = (id) => `setup-checklist-dismissed:${id}`;
const CHANGE_EVENT = "setup-checklist-change";

const subscribe = (cb) => {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(CHANGE_EVENT, cb); window.removeEventListener("storage", cb); };
};

const readDismissed = (id) => {
  try { return localStorage.getItem(dismissKey(id)) === "1"; } catch { return false; }
};

const list = (names, andWord = "and", fallback = "your team") => {
  const n = names.slice(0, 3).map((x) => x.toLowerCase());
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} ${andWord} ${n[n.length - 1]}` : n[0] || fallback;
};

export function useSetupProgress() {
  const t = useT();
  const lang = useLang();
  const { workspace } = useWorkspace();
  const { plan, usage, canCreate, loading: planLoading } = usePlan();
  const term = useBusinessTerminology();
  const id = workspace?.id;

  const dismissed = useSyncExternalStore(subscribe, () => readDismissed(id), () => false);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(dismissKey(id), "1"); } catch { /* ignore */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [id]);

  const reopen = useCallback(() => {
    try { localStorage.removeItem(dismissKey(id)); } catch { /* ignore */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [id]);

  // Roles are not part of the plan usage counts, so they are counted here. The key sits under ["team"], which
  // saving a role already refreshes.
  const { data: roles } = useQuery({
    queryKey: ["team", "roles", id],
    queryFn: () => loadRoles(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
  const roleCount = (roles || []).filter((r) => r.status !== "inactive").length;

  const isPro = plan?.planCode === "PRO";
  const teamCount = usage?.team_members ?? 0;
  const serviceCount = usage?.services ?? 0;
  const teamCap = canCreate("max_team_members");
  const serviceCap = canCreate("max_services");

  const steps = useMemo(() => {
    const profile = getProfile(resolveBusinessCategory(workspace));
    let hasTypes = false;
    try { hasTypes = JSON.parse(workspace?.event_types || "[]").filter(Boolean).length > 0; } catch { /* none */ }
    const serviceExamples = (profile.services || []).slice(0, 2).map((s) => s.name).join(" or ");
    const typeExamples = profile.eventTypes.filter((t) => t !== "Other").slice(0, 2).join(" or ");
    return [
      {
        label: t("Business profile"),
        hint: t("Add your phone and address so quotes and invoices look complete."),
        done: !!(workspace?.phone && (workspace?.address || workspace?.city)),
        to: "/preferences?group=general",
      },
      {
        label: t("Add team"),
        hint: t("Add {roles} so you can assign them to {items}.").replace("{roles}", list(profile.roles.map((r) => r.name), t("and"), t("your team"))).replace("{items}", term.workItemPlural.toLowerCase()),
        done: teamCount > 0,
        to: "/team",
        quick: "team",
        cap: !isPro && Number.isFinite(teamCap.limit) ? `${teamCount}/${teamCap.limit}` : null,
        atLimit: !teamCap.allowed,
      },
      {
        label: t("Add roles"),
        hint: t("Add the roles your team plays, like {roles}, so you can assign them to {items}.").replace("{roles}", list(profile.roles.map((r) => r.name), t("and"), t("your roles"))).replace("{items}", term.workItemPlural.toLowerCase()),
        done: roleCount > 0,
        to: "/team",
        quick: "role",
      },
      {
        label: t("Add services"),
        hint: serviceExamples
          ? t("List what you offer, like {examples}, with rates so quotations fill in automatically.").replace("{examples}", serviceExamples)
          : t("List what you offer with rates, so quotations fill in automatically."),
        done: serviceCount > 0,
        to: "/preferences?group=business",
        quick: "service",
        cap: !isPro && Number.isFinite(serviceCap.limit) ? `${serviceCount}/${serviceCap.limit}` : null,
        atLimit: !serviceCap.allowed,
      },
      {
        label: `${term.workItemSingular} ${t("types")}`,
        optional: true,
        hint: t("Choose the kinds of {items} you handle{examples}.").replace("{items}", term.workItemPlural.toLowerCase()).replace("{examples}", typeExamples ? `, ${t("like")} ${typeExamples}` : ""),
        done: hasTypes,
        to: "/preferences?group=business",
        quick: "types",
      },
    ];
  }, [workspace, term, teamCount, roleCount, serviceCount, isPro, teamCap.limit, teamCap.allowed, serviceCap.limit, serviceCap.allowed, lang]);

  // Optional steps (event types) are shown but never block "complete" or count toward the progress.
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  return {
    // Wait for plan + usage counts, otherwise unfinished-looking zeros flash the banner for a few seconds.
    ready: !!id && !planLoading && !!plan && !!usage && roles !== undefined,
    steps,
    doneCount,
    total: required.length,
    next: required.find((s) => !s.done),
    limitHit: !isPro && steps.some((s) => s.atLimit),
    complete: doneCount === required.length,
    dismissed,
    dismiss,
    reopen,
  };
}
