// Financial year resolution helpers.
import { currentFiscalYearStart, fiscalYearLabel, isoDate } from "./dateFormat.js";

export async function resolveActiveFinancialYear(base44, workspaceId) {
  const list = await base44.asServiceRole.entities.FinancialYear.filter(
    { workspace_id: workspaceId, is_active: true }, "-start_date", 1
  );
  if (list && list.length > 0) return list[0];

  // Fallback: derive current FY window from today.
  const start = currentFiscalYearStart();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);

  const fyId = fiscalYearLabel(start.getFullYear());
  const label = `${start.toLocaleString("en-IN", { month: "long" })} ${start.getFullYear()} - ${end.toLocaleString("en-IN", { month: "long" })} ${end.getFullYear()}`;

  const created = await base44.asServiceRole.entities.FinancialYear.create({
    workspace_id: workspaceId,
    fy_id: fyId,
    label,
    start_date: isoDate(start),
    end_date: isoDate(end),
    is_active: true,
    status: "open"
  });
  return created;
}

export async function listFinancialYears(base44, workspaceId) {
  return base44.asServiceRole.entities.FinancialYear.filter(
    { workspace_id: workspaceId }, "-start_date", 50
  );
}