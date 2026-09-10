// Consolidated per-person financial statement aggregation.
// Merges Team Member / Role assignments with Service Provider assignments
// so a single person who appears in both categories gets one unified statement.
//
// Matching strategy (strongest identity first):
//   1. EventServiceAssignment.provider_id === TeamMember.id  (stable ID)
//   2. provider_name_snapshot normalized-name matches exactly one TeamMember
//   3. Otherwise the service assignment is a standalone service-only person.
//
// All calculations respect workspace isolation (data is pre-filtered by the
// caller) and use only active (non-removed) assignments + ACTIVE transactions.

import { normalizeProviderName } from "./serviceProviderService";
import { isSelfMember } from "./teamService";
import { todayISO } from "./dates";

// ---- Matching ----

// Match a service assignment to a team member.
// Returns the TeamMember record or null.
function matchServiceToMember(sa, members, membersById) {
  // 1. Stable ID match (strongest signal)
  if (sa.provider_id) {
    const m = membersById[sa.provider_id];
    if (m) return m;
  }
  // 2. Normalized name match — only when exactly one member has this name.
  //    If two members share the name we do NOT merge (ambiguous identity).
  const name = normalizeProviderName(sa.provider_name_snapshot).toLowerCase();
  if (!name) return null;
  const matches = members.filter(
    (m) => normalizeProviderName(m.name).toLowerCase() === name
  );
  return matches.length === 1 ? matches[0] : null;
}

// ---- Due-now determination ----

// An assignment is "due now" when its work has started (start date <= today).
// Team assignments: prefer per-member booking_start_date, fall back to event start.
// Service assignments: use event start_date.
function teamAssignmentStarted(a, event) {
  if (!event) return false;
  const start = a.booking_start_date || event.start_date;
  return !!start && start <= todayISO();
}

function serviceAssignmentStarted(sa, event) {
  if (!event) return false;
  return !!event.start_date && event.start_date <= todayISO();
}

// ---- Main builder ----

// Returns an array of consolidated person statements, sorted by name.
// Each statement: { key, name, member, isSelf, teamAssignments, serviceAssignments,
//   rolesTotal, servicesTotal, combinedTotal, totalPaid, teamPaid, servicePaid,
//   dueNowObligation, dueNow, futureDue }
export function buildPersonStatements({
  members = [],
  teamAssignments = [],
  serviceAssignments = [],
  transactions = [],
  eventsById = {}
}) {
  const membersById = {};
  for (const m of members) membersById[m.id] = m;

  // Active (non-removed) assignments only
  const activeTeam = teamAssignments.filter((a) => a.assignment_status !== "removed");
  const activeService = serviceAssignments.filter((a) => a.assignment_status !== "removed");

  // Active transactions, split by type
  const activeTx = transactions.filter((t) => t.status === "ACTIVE");
  const teamPayments = activeTx.filter((t) => t.transaction_type === "TEAM_PAYMENT");
  const servicePayments = activeTx.filter(
    (t) => t.transaction_type === "BUSINESS_EXPENSE" && t.service_assignment_id
  );

  // Resolve each service assignment to a person key (member id or synthetic)
  const svcPersonKey = new Map(); // serviceAssignmentId -> personKey
  const standalone = new Map(); // personKey -> { name, assignments: [] }

  for (const sa of activeService) {
    const member = matchServiceToMember(sa, members, membersById);
    if (member) {
      svcPersonKey.set(sa.id, member.id);
    } else {
      const name = normalizeProviderName(sa.provider_name_snapshot) || "Unknown Provider";
      const key = `svc::${name.toLowerCase()}`;
      svcPersonKey.set(sa.id, key);
      if (!standalone.has(key)) {
        standalone.set(key, { name, assignments: [] });
      }
      standalone.get(key).assignments.push(sa);
    }
  }

  const persons = [];

  // 1. Team members (excluding SELF — owner is not an external payable)
  for (const m of members) {
    if (isSelfMember(m)) continue;
    const tAs = activeTeam.filter((a) => a.team_member_id === m.id);
    const sAs = activeService.filter((sa) => svcPersonKey.get(sa.id) === m.id);
    if (tAs.length === 0 && sAs.length === 0) continue;
    persons.push({
      key: m.id,
      name: m.name,
      member: m,
      isSelf: false,
      teamAssignments: tAs,
      serviceAssignments: sAs
    });
  }

  // 2. Standalone service-only providers
  for (const [key, info] of standalone) {
    persons.push({
      key,
      name: info.name,
      member: null,
      isSelf: false,
      teamAssignments: [],
      serviceAssignments: info.assignments
    });
  }

  // Calculate totals for each person
  const statements = persons.map((p) => {
    // Roles Total — sum of agreed_rate on active team assignments
    const rolesTotal = p.teamAssignments.reduce(
      (s, a) => s + (Number(a.agreed_rate) || 0), 0
    );

    // Services Total — agreed_rate already IS the final event-specific amount
    // (includes add-on; the base rate is NOT counted separately)
    const servicesTotal = p.serviceAssignments.reduce(
      (s, a) => s + (Number(a.agreed_rate) || 0), 0
    );

    // Total Paid — team payments (by member id) + service payments (by assignment id)
    const memberId = p.member?.id;
    const teamPaid = memberId
      ? teamPayments
          .filter((t) => t.team_member_id === memberId)
          .reduce((s, t) => s + (Number(t.amount) || 0), 0)
      : 0;

    const svcAssignmentIds = new Set(p.serviceAssignments.map((sa) => sa.id));
    const servicePaid = servicePayments
      .filter((t) => svcAssignmentIds.has(t.service_assignment_id))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const totalPaid = teamPaid + servicePaid;
    const combinedTotal = rolesTotal + servicesTotal;

    // Due Now obligation — assignments whose work has started
    const dueNowObligation =
      p.teamAssignments
        .filter((a) => teamAssignmentStarted(a, eventsById[a.event_id]))
        .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0) +
      p.serviceAssignments
        .filter((sa) => serviceAssignmentStarted(sa, eventsById[sa.event_id]))
        .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);

    // Due Now = overdue/currently due (obligation minus what's been paid)
    const dueNow = Math.max(0, dueNowObligation - totalPaid);
    // Future Amount Due = total remaining payable
    const futureDue = Math.max(0, combinedTotal - totalPaid);

    return {
      ...p,
      rolesTotal,
      servicesTotal,
      combinedTotal,
      teamPaid,
      servicePaid,
      totalPaid,
      dueNowObligation,
      dueNow,
      futureDue
    };
  });

  // Sort by name (SELF already excluded)
  statements.sort((a, b) => a.name.localeCompare(b.name));

  return statements;
}