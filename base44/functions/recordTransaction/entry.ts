import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findFYForDate } from '../../shared/financialYear.ts';

// Records a financial transaction with server-side validation:
//   1. SELF guard — blocks TEAM_PAYMENT / BUSINESS_EXPENSE transactions
//      where the team member is the workspace owner (name match, case-insensitive).
//      The owner's share is internal profit, not an external payable.
//   2. Financial Year resolution — assigns the correct FY from the transaction date.
//      Blocks creation if no FY exists or the FY is closed.
//
// Frontend button-hiding is not sufficient — this backend function is the
// authoritative enforcement point for the SELF payment restriction.

function normalizeName(s) {
  return (s || '').trim().toLowerCase();
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const { workspace_id, transaction_type, team_member_id, transaction_date } = body;

    if (!workspace_id) return Response.json({ error: 'workspace_id is required' }, { status: 400 });
    if (!transaction_type) return Response.json({ error: 'transaction_type is required' }, { status: 400 });
    if (!transaction_date) return Response.json({ error: 'transaction_date is required' }, { status: 400 });

    // ─── SELF validation ───
    // Block payments to the workspace owner when the transaction is an
    // outgoing payment (TEAM_PAYMENT or BUSINESS_EXPENSE) linked to a team member.
    if ((transaction_type === 'TEAM_PAYMENT' || transaction_type === 'BUSINESS_EXPENSE') && team_member_id) {
      const workspace = await base44.asServiceRole.entities.Workspace.get(workspace_id);
      if (workspace?.owner_user_id) {
        let ownerName = '';
        try {
          const ownerUser = await base44.asServiceRole.entities.User.get(workspace.owner_user_id);
          ownerName = ownerUser?.full_name || '';
        } catch { /* ignore — SELF check skipped if owner can't be resolved */ }

        let teamMemberName = '';
        try {
          const teamMember = await base44.asServiceRole.entities.TeamMember.get(team_member_id);
          teamMemberName = teamMember?.name || '';
        } catch { /* ignore */ }

        if (ownerName && teamMemberName && normalizeName(ownerName) === normalizeName(teamMemberName)) {
          return Response.json({
            error: "Cannot record a payment to the workspace owner (SELF). The owner's share is treated as internal profit, not an external payment.",
          }, { status: 403 });
        }
      }
    }

    // ─── Financial Year resolution ───
    const financialYears = await base44.asServiceRole.entities.FinancialYear.filter(
      { workspace_id },
      "start_date",
      100
    );
    const fy = findFYForDate(transaction_date, financialYears || []);
    if (!fy) {
      return Response.json({
        error: 'No Financial Year is available for this transaction date. Please create the applicable Financial Year first.',
      }, { status: 400 });
    }
    if (fy.status === 'closed') {
      return Response.json({
        error: `Financial Year ${fy.name} is closed. Reopen it to add new transactions.`,
      }, { status: 400 });
    }

    // ─── Create the transaction ───
    const transaction = await base44.entities.FinancialTransaction.create({
      ...body,
      workspace_id,
      financial_year_id: fy.id,
      status: body.status || 'ACTIVE',
    });

    return Response.json({ success: true, transaction });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}