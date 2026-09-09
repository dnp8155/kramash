import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Fetches all Plan, PlanPricing, and PlanLimit records (global, not workspace-scoped).
export function usePlans() {
  const [plans, setPlans] = useState([]);
  const [pricings, setPricings] = useState([]);
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, l] = await Promise.all([
        base44.entities.Plan.list(),
        base44.entities.PlanPricing.list(),
        base44.entities.PlanLimit.list(),
      ]);
      setPlans(p || []);
      setPricings(pr || []);
      setLimits(l || []);
    } catch (e) {
      setError(e?.message || "Failed to load plan configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Update a plan limit
  const updateLimit = useCallback(async (limitId, data) => {
    const updated = await base44.entities.PlanLimit.update(limitId, data);
    setLimits((prev) => prev.map((l) => (l.id === limitId ? updated : l)));
    return updated;
  }, []);

  // Update a pricing option
  const updatePricing = useCallback(async (pricingId, data) => {
    const updated = await base44.entities.PlanPricing.update(pricingId, data);
    setPricings((prev) => prev.map((p) => (p.id === pricingId ? updated : p)));
    return updated;
  }, []);

  // Update a plan
  const updatePlan = useCallback(async (planId, data) => {
    const updated = await base44.entities.Plan.update(planId, data);
    setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    return updated;
  }, []);

  return {
    plans,
    pricings,
    limits,
    loading,
    error,
    refetch: load,
    updateLimit,
    updatePricing,
    updatePlan,
  };
}