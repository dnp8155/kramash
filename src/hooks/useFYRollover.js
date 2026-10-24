import { useCallback, useMemo, useState } from "react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyRolloverState, createNextFY, setActiveFY } from "@/lib/financialYearService";

const key = (workspaceId, state) => `fy-rollover-dismissed:${workspaceId}:${state.next.fyId}:${state.kind}:${state.ended ?? state.kind}`;

const wasDismissed = (k) => {
  try { return localStorage.getItem(k) === "1"; } catch { return false; }
};

// Drives the "financial year is ending" banner. Nothing is created without the user's yes;
// dismissing hides it until the year actually ends (then it asks once more).
export function useFYRollover() {
  const { workspaceId } = useWorkspace();
  const { fiscalYears, refresh } = useFinancialYear();
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  const state = useMemo(() => fyRolloverState(fiscalYears), [fiscalYears]);
  const visible = !!state && !!workspaceId && !wasDismissed(key(workspaceId, state));

  const dismiss = useCallback(() => {
    if (!state) return;
    try { localStorage.setItem(key(workspaceId, state), "1"); } catch { /* ignore */ }
    setTick((t) => t + 1);
  }, [state, workspaceId]);

  const confirm = useCallback(async () => {
    if (!state) return;
    setBusy(true);
    try {
      if (state.kind === "activate") await setActiveFY(workspaceId, state.existing.id);
      else await createNextFY(workspaceId, state.next, state.ended);
      refresh();
    } finally {
      setBusy(false);
    }
  }, [state, workspaceId, refresh]);

  return { state: visible ? state : null, busy, dismiss, confirm };
}
