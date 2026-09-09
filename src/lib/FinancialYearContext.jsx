import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { checkFYOverlap } from "@/utils/finance";

// Workspace-level Financial Year context.
// Provides:
//   - activeFY / activeFYId   → the workspace's official default FY (shared across all members)
//   - selectedFY / selectedFYId → the FY the current user is viewing (personal preference, stored on user.data)
//   - selectFY                 → changes the user's personal viewing FY
//   - setWorkspaceActiveFY     → changes the workspace's official default FY
//
// The active FY is persisted on the FinancialYear entity (is_active=true), so it
// survives refresh, logout/login, and is shared across workspace members.
// The user's viewing preference is stored on user.data.viewing_fy_id and defaults
// to the workspace's active FY when not set.
const FinancialYearContext = createContext(null);

export const FinancialYearProvider = ({ children }) => {
  const { workspaceId } = useWorkspace();
  const [financialYears, setFinancialYears] = useState([]);
  const [activeFY, setActiveFY] = useState(null);
  const [viewingFYId, setViewingFYId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setFinancialYears([]);
      setActiveFY(null);
      setViewingFYId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let fys = await base44.entities.FinancialYear.filter(
        { workspace_id: workspaceId },
        "-start_date"
      );

      // If no FYs exist, initialize the current FY via backend function
      if (!fys || fys.length === 0) {
        try {
          await base44.functions.invoke("initializeFinancialYear", {
            workspace_id: workspaceId,
          });
          fys = await base44.entities.FinancialYear.filter(
            { workspace_id: workspaceId },
            "-start_date"
          );
        } catch {
          /* non-blocking — FY features will show empty state */
        }
      }

      setFinancialYears(fys || []);
      const active = (fys || []).find((fy) => fy.is_active) || (fys || [])[0] || null;
      setActiveFY(active);

      // Load the user's personal viewing FY preference (stored on user.data)
      try {
        const user = await base44.auth.me();
        const uid = user?.data?.viewing_fy_id;
        if (uid && (fys || []).some((fy) => fy.id === uid)) {
          setViewingFYId(uid);
        } else {
          setViewingFYId(null);
        }
      } catch {
        setViewingFYId(null);
      }
    } catch {
      setFinancialYears([]);
      setActiveFY(null);
      setViewingFYId(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  // The FY the current user is viewing — their personal preference if set and
  // valid, otherwise the workspace's official active FY.
  const selectedFY = viewingFYId
    ? financialYears.find((fy) => fy.id === viewingFYId) || activeFY
    : activeFY;

  // Per-user: changes the user's personal viewing FY (stored on user.data).
  const selectFY = useCallback(async (fyId) => {
    setViewingFYId(fyId);
    try {
      await base44.auth.updateMe({ viewing_fy_id: fyId });
    } catch {
      /* non-blocking — in-memory fallback still works for the session */
    }
  }, []);

  // Workspace-level: changes the workspace's official active/default FY.
  // Persists at workspace level (is_active on the FY entity) so all workspace
  // members see the same active FY.
  const setWorkspaceActiveFY = useCallback(
    async (fyId) => {
      const current = financialYears.find((fy) => fy.is_active);
      if (current?.id === fyId) return;
      const updates = [];
      if (current) {
        updates.push(
          base44.entities.FinancialYear.update(current.id, { is_active: false })
        );
      }
      updates.push(
        base44.entities.FinancialYear.update(fyId, { is_active: true })
      );
      await Promise.all(updates);
      await load();
    },
    [financialYears, load]
  );

  // Creates a new FY with validation: no duplicates, no overlaps, start < end.
  const createFY = useCallback(
    async (data) => {
      if (data.start_date >= data.end_date) {
        throw new Error("Start date must be before end date.");
      }
      const duplicate = financialYears.find((fy) => fy.start_date === data.start_date);
      if (duplicate) {
        throw new Error("This Financial Year already exists.");
      }
      if (checkFYOverlap(data.start_date, data.end_date, financialYears)) {
        throw new Error("This Financial Year overlaps with an existing one.");
      }
      const fy = await base44.entities.FinancialYear.create({
        ...data,
        workspace_id: workspaceId,
      });
      await load();
      return fy;
    },
    [financialYears, workspaceId, load]
  );

  // Closes an FY — marks it read-only for historical reporting.
  const closeFY = useCallback(
    async (fyId) => {
      await base44.entities.FinancialYear.update(fyId, { status: "closed" });
      await load();
    },
    [load]
  );

  // Reopens a closed FY.
  const reopenFY = useCallback(
    async (fyId) => {
      await base44.entities.FinancialYear.update(fyId, { status: "open" });
      await load();
    },
    [load]
  );

  // Deletes an FY only if it has no financial records.
  const deleteFY = useCallback(
    async (fyId) => {
      const txns = await base44.entities.FinancialTransaction.filter(
        { financial_year_id: fyId, workspace_id: workspaceId },
        null,
        1
      );
      if (txns && txns.length > 0) {
        throw new Error(
          "This Financial Year contains financial records and cannot be deleted."
        );
      }
      const target = financialYears.find((fy) => fy.id === fyId);
      if (target?.is_active && financialYears.length === 1) {
        throw new Error("Cannot delete the only Financial Year.");
      }
      await base44.entities.FinancialYear.delete(fyId);
      await load();
    },
    [workspaceId, financialYears, load]
  );

  return (
    <FinancialYearContext.Provider
      value={{
        financialYears,
        activeFY,
        activeFYId: activeFY?.id || null,
        selectedFY,
        selectedFYId: selectedFY?.id || null,
        loading,
        selectFY,
        setWorkspaceActiveFY,
        createFY,
        closeFY,
        reopenFY,
        deleteFY,
        refetch: load,
      }}
    >
      {children}
    </FinancialYearContext.Provider>
  );
};

export const useFinancialYear = () => {
  const ctx = useContext(FinancialYearContext);
  if (!ctx)
    throw new Error("useFinancialYear must be used within FinancialYearProvider");
  return ctx;
};