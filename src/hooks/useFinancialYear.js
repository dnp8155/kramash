import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { ensureDefaultFY } from "@/lib/financialYearService";

// Central hook for Financial Year context.
// Loads workspace FY records, resolves the active FY, and manages the
// selected (viewing) FY via localStorage keyed by workspace — so it
// survives refresh and navigation, and is consistent across pages.
export function useFinancialYear() {
  const { workspaceId } = useWorkspace();
  const [selectedFYId, setSelectedFYId] = useState(null);
  const queryClient = useQueryClient();

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

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["financial-years", workspaceId] });
  }, [queryClient, workspaceId]);

  return {
    fiscalYears,
    activeFY,
    selectedFY,
    selectedFYId: selectedFY?.id || null,
    selectFY,
    loading: isLoading,
    refresh,
  };
}