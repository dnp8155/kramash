import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { defaultExpenseCategories } from "@/constants/finance";

// Loads + mutates expense categories scoped to the active workspace.
// Seeds sensible defaults the first time a workspace has no categories.
export function useExpenseCategories() {
  const { workspaceId } = useWorkspace();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seededRef = useRef(false);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.ExpenseCategory.filter(
        { workspace_id: workspaceId },
        "name",
        500
      );
      let result = list || [];
      // Seed defaults once if the workspace has no categories yet.
      if (result.length === 0 && !seededRef.current) {
        seededRef.current = true;
        const created = await base44.entities.ExpenseCategory.bulkCreate(
          defaultExpenseCategories.map((name) => ({
            name,
            workspace_id: workspaceId,
            status: "active",
          }))
        );
        result = (created || []).sort((a, b) => a.name.localeCompare(b.name));
      }
      setCategories(result);
    } catch (e) {
      setError(e?.message || "Failed to load expense categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const createCategory = useCallback(
    async (data) => {
      const c = await base44.entities.ExpenseCategory.create({
        ...data,
        workspace_id: workspaceId,
        status: data.status || "active",
      });
      setCategories((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      return c;
    },
    [workspaceId]
  );

  const updateCategory = useCallback(async (id, data) => {
    const c = await base44.entities.ExpenseCategory.update(id, data);
    setCategories((prev) =>
      [...prev.map((x) => (x.id === id ? c : x))].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    return c;
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: load,
    createCategory,
    updateCategory,
  };
}