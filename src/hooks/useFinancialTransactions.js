import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates financial transactions scoped to the active workspace.
// Pass `eventId` to load only the transactions for a single event (server-side
// filtered); omit it to load the whole workspace ledger.
export function useFinancialTransactions({ eventId, teamMemberId } = {}) {
  const { workspaceId } = useWorkspace();
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
  }, [workspaceId, eventId, teamMemberId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTransaction = useCallback(
    async (data) => {
      const t = await base44.entities.FinancialTransaction.create({
        ...data,
        workspace_id: workspaceId,
        status: data.status || "ACTIVE",
      });
      setTransactions((prev) => [t, ...prev]);
      return t;
    },
    [workspaceId]
  );

  const updateTransaction = useCallback(async (id, data) => {
    const t = await base44.entities.FinancialTransaction.update(id, data);
    setTransactions((prev) => prev.map((x) => (x.id === id ? t : x)));
    return t;
  }, []);

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