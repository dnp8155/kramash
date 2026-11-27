import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// The financial-year start month is locked once the workspace has financial years AND real data in them
// (an event or a payment). Before that, say right after sign-up, the month can still be corrected: the
// empty year records are simply rebuilt from the new month on save.
export function useFYMonthLock(workspaceId) {
  const { data } = useQuery({
    queryKey: ["fy-month-lock", workspaceId],
    queryFn: async () => {
      const [years, tx, events] = await Promise.all([
        base44.entities.FinancialYear.filter({ workspace_id: workspaceId }, "-start_date", 100),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId }, "-created_date", 1),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 1),
      ]);
      return {
        yearIds: (years || []).map((y) => y.id),
        hasData: (tx || []).length > 0 || (events || []).length > 0,
      };
    },
    enabled: !!workspaceId,
  });
  const yearIds = data?.yearIds || [];
  return { locked: yearIds.length > 0 && !!data?.hasData, yearIds };
}
