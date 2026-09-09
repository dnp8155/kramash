import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Loads + mutates quotations scoped to the active workspace.
export function useQuotations() {
  const { workspaceId } = useWorkspace();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setQuotations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.Quotation.filter(
        { workspace_id: workspaceId },
        "-quotation_date",
        500
      );
      setQuotations(list || []);
    } catch (e) {
      setError(e?.message || "Failed to load quotations");
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createQuotation = useCallback(
    async (data) => {
      const q = await base44.entities.Quotation.create({
        ...data,
        workspace_id: workspaceId,
      });
      setQuotations((prev) => [q, ...prev]);
      return q;
    },
    [workspaceId]
  );

  const updateQuotation = useCallback(async (id, data) => {
    const q = await base44.entities.Quotation.update(id, data);
    setQuotations((prev) => prev.map((x) => (x.id === id ? q : x)));
    return q;
  }, []);

  const deleteQuotation = useCallback(async (id) => {
    await base44.entities.Quotation.delete(id);
    setQuotations((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    quotations,
    loading,
    error,
    refetch: load,
    createQuotation,
    updateQuotation,
    deleteQuotation,
  };
}

// Loads all quotation items for a specific quotation.
export function useQuotationItems(quotationId) {
  const { workspaceId } = useWorkspace();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId || !quotationId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await base44.entities.QuotationItem.filter(
        { workspace_id: workspaceId, quotation_id: quotationId },
        "sort_order",
        500
      );
      setItems(list || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, quotationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, refetch: load, setItems };
}