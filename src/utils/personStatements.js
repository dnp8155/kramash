// Consolidated person-wise financial statement computation.
//
// Aggregates Team Member/Role assignments AND Service Provider assignments
// per person, plus all valid payment transactions, to produce a single
// statement showing:
//   - rolesTotal       sum of agreed_rate from team assignments
//   - servicesTotal    sum of rate from service assignments (add-on inclusive)
//   - totalObligation  rolesTotal + servicesTotal
//   - totalPaid        sum of ACTIVE TEAM_PAYMENT + BUSINESS_EXPENSE transactions
//   - futureDue        max(0, totalObligation - totalPaid)
//   - dueNow           max(0, pastObligation - pastPaid) — overdue from completed events
//
// A person can be: Team-only, Service-only, or both. Matching is by stable
// TeamMember ID (provider_id on service assignments references the same
// TeamMember). SELF/Owner is identified by name match and excluded from
// external payable amounts.
//
// All calculations respect the selected Financial Year:
//   - Transactions filtered by financial_year_id (with date-based fallback)
//   - Assignments filtered by the event's FY (resolved from event start_date)

import { findFYForDate, resolveTransactionFYId } from "./finance";

export function computePersonStatements({
  members = [],
  teamAssignments = [],
  serviceAssignments = [],
  transactions = [],
  events = [],
  financialYears = [],
  selectedFYId = null,
  ownerName = "",
  today = new Date().toISOString().slice(0, 10),
}) {
  const eventMap = new Map(events.map((e) => [e.id, e]));

  // FY filter for assignments: resolve FY from the event's start_date
  const assignmentFYMatches = (eventId) => {
    if (!selectedFYId) return true;
    const ev = eventMap.get(eventId);
    if (!ev) return false;
    const fy = findFYForDate(ev.start_date, financialYears);
    return fy?.id === selectedFYId;
  };

  // FY filter for transactions: use stored financial_year_id with date fallback
  const txnFYMatches = (t) => {
    if (!selectedFYId) return true;
    return resolveTransactionFYId(t, financialYears) === selectedFYId;
  };

  // Pre-filter by FY + active status
  const fyTeamAssignments = teamAssignments.filter(
    (a) => a.assignment_status === "Assigned" && assignmentFYMatches(a.event_id)
  );
  const fyServiceAssignments = serviceAssignments.filter(
    (sa) => sa.assignment_status === "Assigned" && assignmentFYMatches(sa.event_id)
  );
  const fyTransactions = transactions.filter(
    (t) => t.status === "ACTIVE" && txnFYMatches(t)
  );

  // Determine if an event has already occurred (end_date <= today, or
  // start_date <= today if single-day). Used for Due Now calculation.
  const isPastEvent = (eventId) => {
    const ev = eventMap.get(eventId);
    if (!ev) return false;
    const refDate = ev.end_date || ev.start_date;
    return refDate <= today;
  };

  return members.map((member) => {
    const isSelf =
      !!ownerName &&
      member.name.trim().toLowerCase() === ownerName.trim().toLowerCase();

    // --- Team / Role assignments ---
    const memberTeamAssignments = fyTeamAssignments.filter(
      (a) => a.team_member_id === member.id
    );
    const rolesTotal = memberTeamAssignments.reduce(
      (s, a) => s + (Number(a.agreed_rate) || 0),
      0
    );

    // --- Service Provider assignments ---
    // provider_id references a TeamMember ID (same identity layer).
    // Service rate is the final event-specific amount (add-on inclusive —
    // the rate field already represents the total for that assignment).
    const memberServiceAssignments = fyServiceAssignments.filter(
      (sa) => sa.provider_id === member.id
    );
    const servicesTotal = memberServiceAssignments.reduce(
      (s, sa) => s + (Number(sa.rate) || 0),
      0
    );

    // --- Payment lookup sets ---
    const teamAssignmentIds = new Set(memberTeamAssignments.map((a) => a.id));
    const serviceAssignmentIds = new Set(
      memberServiceAssignments.map((sa) => sa.id)
    );

    // All valid payments for this person across both assignment types.
    // TEAM_PAYMENT → team_assignment_id; BUSINESS_EXPENSE → service_assignment_id.
    // Dedup is inherent: each transaction has a unique id and we filter by
    // status === "ACTIVE", so VOID/deleted transactions are excluded.
    const personPayments = fyTransactions.filter(
      (t) =>
        (t.transaction_type === "TEAM_PAYMENT" &&
          teamAssignmentIds.has(t.team_assignment_id)) ||
        (t.transaction_type === "BUSINESS_EXPENSE" &&
          serviceAssignmentIds.has(t.service_assignment_id))
    );
    const totalPaid = personPayments.reduce(
      (s, t) => s + (Number(t.amount) || 0),
      0
    );

    // --- Due Now: obligation from past events minus payments for those ---
    const pastTeamAssignments = memberTeamAssignments.filter((a) =>
      isPastEvent(a.event_id)
    );
    const pastServiceAssignments = memberServiceAssignments.filter((sa) =>
      isPastEvent(sa.event_id)
    );
    const pastObligation =
      pastTeamAssignments.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0) +
      pastServiceAssignments.reduce((s, sa) => s + (Number(sa.rate) || 0), 0);

    const pastTeamIds = new Set(pastTeamAssignments.map((a) => a.id));
    const pastServiceIds = new Set(pastServiceAssignments.map((sa) => sa.id));
    const pastPaid = fyTransactions
      .filter(
        (t) =>
          (t.transaction_type === "TEAM_PAYMENT" &&
            pastTeamIds.has(t.team_assignment_id)) ||
          (t.transaction_type === "BUSINESS_EXPENSE" &&
            pastServiceIds.has(t.service_assignment_id))
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const dueNow = Math.max(0, pastObligation - pastPaid);
    const totalObligation = rolesTotal + servicesTotal;
    const futureDue = Math.max(0, totalObligation - totalPaid);

    return {
      member,
      isSelf,
      rolesTotal,
      servicesTotal,
      totalObligation,
      totalPaid,
      futureDue,
      dueNow,
      teamAssignmentCount: memberTeamAssignments.length,
      serviceAssignmentCount: memberServiceAssignments.length,
      hasTeamAssignments: memberTeamAssignments.length > 0,
      hasServiceAssignments: memberServiceAssignments.length > 0,
    };
  });
}