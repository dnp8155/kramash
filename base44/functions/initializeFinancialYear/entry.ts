import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getCurrentFinancialYear, findFYForDate } from "../../shared/financialYear.ts";

// Ensures a workspace has at least one usable Financial Year, and backfills
// existing transactions with financial_year_id based on their transaction_date.
// Called during onboarding (for new workspaces) and lazily by FinancialYearProvider
// (for existing workspaces that predate the FY architecture).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return Response.json({ error: "workspace_id is required" }, { status: 400 });
    }

    // Verify the user is a workspace member
    const members = await base44.asServiceRole.entities.WorkspaceMember.filter(
      { user_id: user.id, workspace_id, status: "active" },
      "-created_date",
      1
    );
    if (!members || members.length === 0) {
      return Response.json({ error: "Forbidden: not a workspace member" }, { status: 403 });
    }

    // Load existing FYs for this workspace
    const existingFYs = await base44.asServiceRole.entities.FinancialYear.filter(
      { workspace_id },
      "-start_date"
    );

    const currentFY = getCurrentFinancialYear();

    // Check if the current FY already exists (by start_date, which is unique per FY)
    let currentFYRecord = (existingFYs || []).find(
      (fy) => fy.start_date === currentFY.start_date
    );

    // Create the current FY if it doesn't exist
    if (!currentFYRecord) {
      currentFYRecord = await base44.asServiceRole.entities.FinancialYear.create({
        workspace_id,
        name: currentFY.name,
        start_date: currentFY.start_date,
        end_date: currentFY.end_date,
        status: "open",
        is_active: false, // will be activated below if no other active FY exists
      });
    }

    // Ensure exactly one FY is active: if none is active, activate the current FY
    const allFYs = currentFYRecord && !existingFYs?.some(f => f.id === currentFYRecord.id)
      ? [...(existingFYs || []), currentFYRecord]
      : (existingFYs || []);

    const hasActive = allFYs.some((fy) => fy.is_active);
    if (!hasActive && currentFYRecord) {
      await base44.asServiceRole.entities.FinancialYear.update(currentFYRecord.id, {
        is_active: true,
      });
      currentFYRecord.is_active = true;
    }

    // Backfill transactions without financial_year_id
    const transactions = await base44.asServiceRole.entities.FinancialTransaction.filter(
      { workspace_id },
      "-transaction_date",
      1000
    );

    const updatedFYs = allFYs;
    let backfilled = 0;
    let unmappable = 0;

    const toUpdate: any[] = [];
    for (const txn of transactions || []) {
      if (!txn.financial_year_id) {
        const fy = findFYForDate(txn.transaction_date, updatedFYs);
        if (fy) {
          toUpdate.push({ id: txn.id, financial_year_id: fy.id });
          backfilled++;
        } else {
          unmappable++;
        }
      }
    }

    if (toUpdate.length > 0) {
      await base44.asServiceRole.entities.FinancialTransaction.bulkUpdate(toUpdate);
    }

    return Response.json({
      success: true,
      financialYear: currentFYRecord,
      totalFYs: allFYs.length,
      backfilled,
      unmappable,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}