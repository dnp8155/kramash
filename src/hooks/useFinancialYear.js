import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { ensureDefaultFY, fyDisplayLabel } from "@/lib/financialYearService";

// ---- Shared store (cross-instance) ----
// dateRange and selectedFYId are module-level so every component that
// calls useFinancialYear() shares the same state. When the selector
// updates the range, all subscribers re-render with the new value.
let _dateRange = null;
let _selectedFYId = null;
const _listeners = new Set();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _setDateRangeShared(range, workspaceId) {
  _dateRange = range;
  if (workspaceId) {
    try {
      localStorage.setItem(`date-range-${workspaceId}`, JSON.stringify(range));
    } catch {}
  }
  _notify();
}

function _setSelectedFYIdShared(id, workspaceId) {
  _selectedFYId = id;
  if (workspaceId && id) {
    try {
      localStorage.setItem(`fy-selected-${workspaceId}`, id);
    } catch {}
  }
  _notify();
}

// Central hook for Financial Year context.
// Loads workspace FY records, resolves the active FY, and manages the
// selected (viewing) FY via localStorage keyed by workspace — so it
// survives refresh and navigation, and is consistent across pages.
export function useFinancialYear() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  // Subscribe to shared store
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = _subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // Reset selection when workspace changes — prevents stale FY from
  // the previous workspace appearing briefly during the switch.
  useEffect(() => {
    _dateRange = null;
    _selectedFYId = null;
    if (workspaceId) {
      try {
        localStorage.removeItem(`date-range-${workspaceId}`);
      } catch {}
    }
    _notify();
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
    if (_selectedFYId && fiscalYears.some((f) => f.id === _selectedFYId)) return;
    const stored = localStorage.getItem(`fy-selected-${workspaceId}`);
    if (stored && fiscalYears.some((f) => f.id === stored)) {
      _setSelectedFYIdShared(stored, workspaceId);
    } else if (activeFY) {
      _setSelectedFYIdShared(activeFY.id, workspaceId);
    }
  }, [fiscalYears, activeFY, workspaceId]);

  const selectFY = useCallback(
    (fyId) => {
      _setSelectedFYIdShared(fyId, workspaceId);
    },
    [workspaceId]
  );

  const selectedFY = useMemo(
    () =>
      fiscalYears.find((f) => f.id === _selectedFYId) ||
      activeFY ||
      null,
    [fiscalYears, _selectedFYId, activeFY]
  );

  // Restore dateRange from localStorage or initialise from selectedFY
  useEffect(() => {
    if (!fiscalYears.length || !workspaceId) return;
    if (_dateRange) return;

    const stored = localStorage.getItem(`date-range-${workspaceId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate stored FY range still exists
        if (
          parsed.type === "fy" &&
          parsed.fyId &&
          !fiscalYears.some((f) => f.id === parsed.fyId)
        ) {
          // Stale — fall through to selectedFY init
        } else {
          _setDateRangeShared(parsed, workspaceId);
          return;
        }
      } catch {}
    }
    if (selectedFY) {
      _setDateRangeShared(
        {
          type: "fy",
          label: fyDisplayLabel(selectedFY),
          startDate: selectedFY.start_date,
          endDate: selectedFY.end_date,
          fyId: selectedFY.id,
        },
        workspaceId
      );
    }
  }, [fiscalYears, selectedFY, workspaceId]);

  const selectDateRange = useCallback(
    (range) => {
      _setDateRangeShared(range, workspaceId);
      if (range.type === "fy" && range.fyId) {
        _setSelectedFYIdShared(range.fyId, workspaceId);
      }
    },
    [workspaceId]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["financial-years", workspaceId],
    });
  }, [queryClient, workspaceId]);

  return {
    fiscalYears,
    activeFY,
    selectedFY,
    selectedFYId: selectedFY?.id || null,
    selectFY,
    dateRange: _dateRange,
    selectDateRange,
    loading: isLoading,
    refresh,
  };
}