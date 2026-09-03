import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyWorkspaceMembership } from "../../shared/planEngine.ts";

// Backend-protected payment creation for Team Payments and Service Provider Payments.
// Rejects any attempt to create a payment where the payee is the workspace owner (SELF).
// kind = "team" | "service"
//   team:    requires event_id, assignment_id, team_member_id
//   service: requires event_id, service_assignment_id (provider resolved from it)
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const {
      kind, workspace_id, event_id,
      assignment_id, team_member_id,
      service_assignment_id,
      amount, payment_method, transaction_date,
      reference_number, notes, financial_year_id
    } = body;
    // service_assignment_id is destructured above and used below for service payments.

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!event_id) return Response.json({ error: "event_id required" }, { status: 400 });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    if (!transaction_date) return Response.json({ error: "transaction_date required" }, { status: 400 });
    if (!financial_year_id) return Response.json({ error: "financial_year_id required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(base44, user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    // Verify the event belongs to this workspace
    const ev = await base44.entities.Event.get(event_id);
    if (!ev || ev.workspace_id !== workspace_id) {
      return Response.json({ error: "Event not found in this workspace." }, { status: 404 });
    }

    let payloadMemberId = "";
    let teamAssignmentId = "";
    let expenseCategoryName = "";
    let transactionType = "";
    let payeeName = "";

    if (kind === "team") {
      if (!assignment_id || !team_member_id) {
        return Response.json({ error: "assignment_id and team_member_id required for team payments." }, { status: 400 });
      }
      const a = await base44.entities.EventTeamAssignment.get(assignment_id);
      if (!a || a.workspace_id !== workspace_id || a.event_id !== event_id) {
        return Response.json({ error: "Assignment not found for this event." }, { status: 404 });
      }
      if (a.team_member_id !== team_member_id) {
        return Response.json({ error: "Assignment does not match the selected team member." }, { status: 400 });
      }
      const member = await base44.entities.TeamMember.get(team_member_id);
      if (!member || member.workspace_id !== workspace_id) {
        return Response.json({ error: "Team member not found in this workspace." }, { status: 404 });
      }
      // SELF guard — the owner cannot be paid as an external team member.
      if (member.is_self) {
        return Response.json({ error: "SELF_PAYMENT_BLOCKED", message: "The workspace owner cannot be paid as a team member. This amount is treated as owner share, not an external payment." }, { status: 403 });
      }
      payloadMemberId = team_member_id;
      teamAssignmentId = assignment_id;
      transactionType = "TEAM_PAYMENT";
      payeeName = member.name;
    } else if (kind === "service") {
      if (!service_assignment_id) {
        return Response.json({ error: "service_assignment_id required for service payments." }, { status: 400 });
      }
      const sa = await base44.entities.EventServiceAssignment.get(service_assignment_id);
      if (!sa || sa.workspace_id !== workspace_id || sa.event_id !== event_id) {
        return Response.json({ error: "Service assignment not found for this event." }, { status: 404 });
      }
      // SELF guard — if the service provider is the workspace owner, block the payment.
      if (sa.provider_id) {
        const provider = await base44.entities.TeamMember.get(sa.provider_id);
        if (provider && provider.workspace_id === workspace_id && provider.is_self) {
          return Response.json({ error: "SELF_PAYMENT_BLOCKED", message: "The workspace owner cannot be paid as a service provider. This amount is treated as owner share, not an external payment." }, { status: 403 });
        }
      }
      expenseCategoryName = `Service: ${sa.service_name_snapshot || ""}`;
      transactionType = "BUSINESS_EXPENSE";
      payeeName = sa.provider_name_snapshot || sa.service_name_snapshot || "";
    } else {
      return Response.json({ error: "kind must be 'team' or 'service'." }, { status: 400 });
    }

    const created = await base44.entities.FinancialTransaction.create({
      workspace_id,
      financial_year_id,
      event_id,
      transaction_type: transactionType,
      team_member_id: payloadMemberId || undefined,
      team_assignment_id: teamAssignmentId || undefined,
      service_assignment_id: (kind === "service" ? service_assignment_id : undefined) || undefined,
      expense_category_name_snapshot: expenseCategoryName || undefined,
      amount: amt,
      payment_method: payment_method || "Cash",
      transaction_date,
      reference_number: (reference_number || "").trim(),
      notes: (notes || "").trim(),
      status: "ACTIVE"
    });

    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}