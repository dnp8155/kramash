// recordPayment — Team/Service provider payment with SELF guard.
import { supabaseAdmin, getUserFromRequest } from "../_shared/supabaseClient.ts";
import { verifyWorkspaceMembership } from "../_shared/planEngine.ts";

Deno.serve(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const {
      kind, workspace_id, event_id,
      assignment_id, team_member_id, service_assignment_id,
      amount, payment_method, transaction_date,
      reference_number, notes, financial_year_id
    } = body;

    if (!workspace_id) return Response.json({ error: "workspace_id required" }, { status: 400 });
    if (!event_id) return Response.json({ error: "event_id required" }, { status: 400 });
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return Response.json({ error: "Amount must be greater than zero." }, { status: 400 });
    if (!transaction_date) return Response.json({ error: "transaction_date required" }, { status: 400 });
    if (!financial_year_id) return Response.json({ error: "financial_year_id required" }, { status: 400 });

    const isMember = await verifyWorkspaceMembership(user.id, workspace_id);
    if (!isMember) return Response.json({ error: "Not a workspace member" }, { status: 403 });

    const { data: ev } = await supabaseAdmin.from("events").select("*").eq("id", event_id).single();
    if (!ev || ev.workspace_id !== workspace_id) {
      return Response.json({ error: "Event not found in this workspace." }, { status: 404 });
    }

    let payloadMemberId = "";
    let teamAssignmentId = "";
    let expenseCategoryName = "";
    let transactionType = "";

    if (kind === "team") {
      if (!assignment_id || !team_member_id) {
        return Response.json({ error: "assignment_id and team_member_id required for team payments." }, { status: 400 });
      }
      const { data: a } = await supabaseAdmin.from("event_team_assignments").select("*").eq("id", assignment_id).single();
      if (!a || a.workspace_id !== workspace_id || a.event_id !== event_id) {
        return Response.json({ error: "Assignment not found for this event." }, { status: 404 });
      }
      if (a.team_member_id !== team_member_id) {
        return Response.json({ error: "Assignment does not match the selected team member." }, { status: 400 });
      }
      const { data: member } = await supabaseAdmin.from("team_members").select("*").eq("id", team_member_id).single();
      if (!member || member.workspace_id !== workspace_id) {
        return Response.json({ error: "Team member not found in this workspace." }, { status: 404 });
      }
      if (member.is_self) {
        return Response.json({ error: "SELF_PAYMENT_BLOCKED", message: "The workspace owner cannot be paid as a team member." }, { status: 403 });
      }
      payloadMemberId = team_member_id;
      teamAssignmentId = assignment_id;
      transactionType = "TEAM_PAYMENT";
    } else if (kind === "service") {
      if (!service_assignment_id) {
        return Response.json({ error: "service_assignment_id required for service payments." }, { status: 400 });
      }
      const { data: sa } = await supabaseAdmin.from("event_service_assignments").select("*").eq("id", service_assignment_id).single();
      if (!sa || sa.workspace_id !== workspace_id || sa.event_id !== event_id) {
        return Response.json({ error: "Service assignment not found for this event." }, { status: 404 });
      }
      if (sa.provider_id) {
        const { data: provider } = await supabaseAdmin.from("team_members").select("*").eq("id", sa.provider_id).single();
        if (provider && provider.workspace_id === workspace_id && provider.is_self) {
          return Response.json({ error: "SELF_PAYMENT_BLOCKED", message: "The workspace owner cannot be paid as a service provider." }, { status: 403 });
        }
      }
      expenseCategoryName = `Service: ${sa.service_name_snapshot || ""}`;
      transactionType = "BUSINESS_EXPENSE";
    } else {
      return Response.json({ error: "kind must be 'team' or 'service'." }, { status: 400 });
    }

    const { data: created, error } = await supabaseAdmin
      .from("financial_transactions")
      .insert({
        workspace_id, financial_year_id, event_id,
        transaction_type: transactionType,
        team_member_id: payloadMemberId || null,
        team_assignment_id: teamAssignmentId || null,
        service_assignment_id: kind === "service" ? service_assignment_id : null,
        expense_category_name_snapshot: expenseCategoryName || null,
        amount: amt, payment_method: payment_method || "Cash",
        transaction_date, reference_number: (reference_number || "").trim(),
        notes: (notes || "").trim(), status: "ACTIVE"
      })
      .select("*")
      .single();
    if (error) throw error;
    return Response.json(created);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});