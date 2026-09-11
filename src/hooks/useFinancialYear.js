import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { ensureDefaultFY, fyDisplayLabel } from "@/lib/financialYearService";

// Central hook for Financial Year context.
// Loads workspace FY records, resolves the active FY, and manages the
// selected (viewing) FY via localStorage keyed by workspace — so it
// survives refresh and navigation, and is consistent across pages.
export function useFinancialYear() {
  const { workspaceId } = useWorkspace();
  const [selectedFYId, setSelectedFYId] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const queryClient = useQueryClient();

  // Reset selection when workspace changes — prevents stale FY from
  // the previous workspace appearing briefly during the switch.
  useEffect(() => {
    setSelectedFYId(null);
    setDateRange(null);
    if (workspaceId) localStorage.removeItem(`date-range-${workspaceId}`);
  }, [workspaceId]);

  const { data: fiscalYears = [], isLoading } = useQuery({
    queryKey: ["financial-years", workspaceId],
    queryFn: async () => {
      return await ensureDefaultFY(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const activeFY = useMemo(
    () => fiscalYears.find((f) => f.is_active) || null,
    [fiscalYears]
  );

  // Restore selected FY from localStorage or default to active
  useEffect(() => {
    if (!fiscalYears.length || !workspaceId) return;
    const stored = localStorage.getItem(`fy-selected-${workspaceId}`);
    if (stored && fiscalYears.some((f) => f.id === stored)) {
      setSelectedFYId(stored);
    } else if (activeFY) {
      setSelectedFYId(activeFY.id);
    }
  }, [fiscalYears, activeFY, workspaceId]);

  const selectFY = useCallback((fyId) => {
    setSelectedFYId(fyId);
    if (workspaceId) localStorage.setItem(`fy-selected-${workspaceId}`, fyId);
  }, [workspaceId]);

  const selectedFY = useMemo(
    () => fiscalYears.find((f) => f.id === selectedFYId) || activeFY || null,
    [fiscalYears, selectedFYId, activeFY]
  );

  // Restore dateRange from localStorage or initialise from selectedFY
  useEffect(() => {
    if (!fiscalYears.length || !workspaceId) return;
    if (dateRange) return;

    const stored = localStorage.getItem(`date-range-${workspaceId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate stored FY range still exists
        if (parsed.type === "fy" && parsed.fyId && !fiscalYears.some((f) => f.id === parsed.fyId)) {
          // Stale — fall through to selectedFY init
        } else {
          setDateRange(parsed);
          return;
        }
      } catch {}
    }
    if (selectedFY) {
      setDateRange({
        type: "fy",
        label: fyDisplayLabel(selectedFY),
        startDate: selectedFY.start_date,
        endDate: selectedFY.end_date,
        fyId: selectedFY.id,
      });
    }
  }, [fiscalYears, selectedFY, workspaceId, dateRange]);

  const selectDateRange = useCallback((range) => {
    setDateRange(range);
    if (workspaceId) localStorage.setItem(`date-range-${workspaceId}`, JSON.stringify(range));
    if (range.type === "fy" && range.fyId) {
      selectFY(range.fyId);
    }
  }, [workspaceId, selectFY]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["financial-years", workspaceId] });
  }, [queryClient, workspaceId]);

  return {
    fiscalYears,
    activeFY,
    selectedFY,
    selectedFYId: selectedFY?.id || null,
    selectFY,
    dateRange,
    selectDateRange,
    loading: isLoading,
    refresh,
  };
}