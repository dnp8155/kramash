import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useFinancialYear } from "@/lib/FinancialYearContext";
import { findFYForDate } from "@/utils/finance";

// Loads + mutates financial transactions scoped to the active workspace.
// Pass `eventId` to load only the transactions for a single event (server-side
// filtered); omit it to load the whole workspace ledger.
// Automatically assigns financial_year_id on create/update based on date.
export function useFinancialTransactions({ eventId, teamMemberId, financialYearId } = {}) {
  const { workspaceId } = useWorkspace();
  const { financialYears } = useFinancialYear();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = { workspace_id: workspaceId };
      if (eventId) query.event_id = eventId;
      if (teamMemberId) query.team_member_id = teamMemberId;
      if (financialYearId) query.financial_year_id = financialYearId;
      const list = await base44.entities.FinancialTransaction.filter(
        query,
        "-transaction_date",
        1000
      );
      setTransactions(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, eventId, teamMemberId, financialYearId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTransaction = useCallback(
    async (data) => {
      // Route through the recordTransaction backend function for:
      //   - SELF validation (blocks payments to the workspace owner)
      //   - Financial Year resolution (server-side, authoritative)
      const res = await base44.functions.invoke("recordTransaction", {
        ...data,
        workspace_id: workspaceId,
      });
      const result = res?.data || res;
      if (result?.error) throw new Error(result.error);
      if (!result?.success) throw new Error("Failed to create transaction");
      const t = result.transaction;
      // Only add to local state if it matches the current server-side filter
      if (t && (!financialYearId || t.financial_year_id === financialYearId)) {
        setTransactions((prev) => [t, ...prev]);
      }
      return t;
    },
    [workspaceId, financialYearId]
  );

  const updateTransaction = useCallback(
    async (id, data) => {
      const updateData = { ...data };
      // If date changed, re-resolve the FY
      if (data.transaction_date) {
        const fy = findFYForDate(data.transaction_date, financialYears);
        if (!fy) {
          throw new Error(
            "No Financial Year is available for this transaction date. Please create the applicable Financial Year first."
          );
        }
        if (fy.status === "closed") {
          throw new Error(
            `Financial Year ${fy.name} is closed. Reopen it to modify transactions.`
          );
        }
        updateData.financial_year_id = fy.id;
      }
      const t = await base44.entities.FinancialTransaction.update(id, updateData);
      setTransactions((prev) => prev.map((x) => (x.id === id ? t : x)));
      return t;
    },
    [financialYears]
  );

  // Soft-delete: marks the transaction VOID so it stays in audit history but is
  // excluded from all totals. Can be reversed by unvoiding.
  const voidTransaction = useCallback(async (id) => {
    const t = await base44.entities.FinancialTransaction.update(id, { status: "VOID" });
    setTransactions((prev) => prev.map((x) => (x.id === id ? t : x)));
    return t;
  }, []);

  const unvoidTransaction = useCallback(async (id) => {
    const t = await base44.entities.FinancialTransaction.update(id, { status: "ACTIVE" });
    setTransactions((prev) => prev.map((x) => (x.id === id ? t : x)));
    return t;
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await base44.entities.FinancialTransaction.delete(id);
    setTransactions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    transactions,
    loading,
    error,
    refetch: load,
    createTransaction,
    updateTransaction,
    voidTransaction,
    unvoidTransaction,
    deleteTransaction,
  };
}