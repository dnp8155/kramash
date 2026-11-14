import { useState, useEffect, useMemo, useCallback } from "react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { holidayCodeForCountry, loadHolidayRows, groupHolidays } from "@/lib/holidays";

// What the Team calendar shows: the workspace setting (Preferences → Region Settings). The switches on the calendar
// save to that same setting, so turning holidays on in one place turns them on in the other.
// Older versions kept a per-device choice under this key; it is cleared so it can no longer hide the real setting.
const legacyKey = (wsId) => `holidays-override:${wsId || ""}`;

export function useHolidays() {
  const { workspace, workspaceId, setWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { localStorage.removeItem(legacyKey(workspaceId)); } catch { /* ignore */ } }, [workspaceId]);

  const workspaceCode = workspace?.holiday_country || holidayCodeForCountry(workspace?.country);
  const on = !!workspace?.holidays_enabled;
  const country = workspaceCode; // the country is chosen in Preferences only
  const regional = !!workspace?.holiday_regional;

  useEffect(() => {
    let alive = true;
    if (!on || !country) { setRows([]); return undefined; }
    setLoading(true);
    loadHolidayRows(country).then((r) => { if (alive) { setRows(r); setLoading(false); } });
    return () => { alive = false; };
  }, [on, country]);

  const byDate = useMemo(() => (on ? groupHolidays(rows, regional) : {}), [on, rows, regional]);

  // patch: { on?, regional? }. Shown at once, saved to the workspace, put back if the save fails.
  const change = useCallback(async (patch) => {
    if (!workspace?.id) return;
    const data = {};
    if (patch.on !== undefined) data.holidays_enabled = !!patch.on;
    if (patch.regional !== undefined) data.holiday_regional = !!patch.regional;
    const before = workspace;
    setWorkspace({ ...workspace, ...data });
    try {
      const updated = await base44.entities.Workspace.update(workspace.id, data);
      if (updated) setWorkspace(updated);
    } catch (e) {
      // Put back, and say so (e.g. a read-only / suspended workspace), instead of the switch silently flipping back.
      setWorkspace(before);
      toast({ title: "Couldn't change holidays", description: e?.message, variant: "destructive" });
    }
  }, [workspace, setWorkspace, toast]);

  return { on, country, regional, workspaceCode, byDate, loading, change };
}
