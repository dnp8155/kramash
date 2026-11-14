import { isIncludeItem, isTeamItem } from "@/lib/quotationCalc";

const active = (a) => a.assignment_status !== "removed";

// What the accepted quotation lists that the event has no card for:
//  - members: quoted people with no active team assignment on the event
//  - services: quoted services with no active service assignment, or not linked to a saved service
//    (the sync only creates cards for services that are linked)
// Roles quoted without a person are NOT repeated here: the Team tab already shows them as
// "No member selected" cards (see openRoleSlots).
// A quoted person who is not on the event but whose place was taken by someone else (same role, same dates) is
// reported as a replacement ("Quoted X, now Y") instead of a missing member, so the card can say the team no longer
// matches the quotation and offer to update the quotation quietly.
const roleSet = (txt) => new Set(String(txt || "").split("&").map((r) => r.trim().toLowerCase()).filter(Boolean));
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

export function quotationSyncGaps(quotationItems, teamAssignments, serviceAssignments, { memberName = () => "", eventDates = [] } = {}) {
  const items = (quotationItems || []).filter((it) => !isIncludeItem(it));
  const team = (teamAssignments || []).filter(active);
  const svc = (serviceAssignments || []).filter(active);

  const assignedMembers = new Set(team.map((a) => a.team_member_id));
  const members = [];
  const replacements = [];
  const seenMembers = new Set();
  const quotedIds = new Set(items.filter((it) => isTeamItem(it) && it.team_member_id).map((it) => it.team_member_id));
  const extras = team.filter((a) => !quotedIds.has(a.team_member_id));
  for (const it of items) {
    if (!isTeamItem(it) || !it.team_member_id || seenMembers.has(it.team_member_id)) continue;
    seenMembers.add(it.team_member_id);
    if (assignedMembers.has(it.team_member_id)) continue;
    const name = String(it.team_member_name_snapshot || "").trim() || "Team member";
    const mine = items.filter((x) => isTeamItem(x) && x.team_member_id === it.team_member_id);
    const roles = roleSet(mine.map((x) => x.description).join("&"));
    const dates = new Set(mine.map((x) => x.day_date).filter(Boolean));
    const idx = extras.findIndex((a) => {
      const aDates = new Set((Array.isArray(a.working_dates) && a.working_dates.length ? a.working_dates : eventDates).filter(Boolean));
      return sameSet(roleSet(a.role_name_snapshot), roles) && (dates.size === 0 || sameSet(aDates, dates));
    });
    if (idx === -1) { members.push(name); continue; }
    const [a] = extras.splice(idx, 1);
    replacements.push({ fromId: it.team_member_id, fromName: name, toId: a.team_member_id, toName: memberName(a.team_member_id) || "Team member", role: String(a.role_name_snapshot || "").trim() });
  }

  const assignedServices = new Set(svc.map((a) => a.service_id));
  const services = [];
  const seenServices = new Set();
  for (const it of items) {
    if (it.item_type !== "service") continue;
    const key = it.reference_id || `name:${String(it.name || "").trim().toLowerCase()}`;
    if (seenServices.has(key)) continue;
    seenServices.add(key);
    if (!it.reference_id || !assignedServices.has(it.reference_id)) services.push(String(it.name || "").trim() || "Service");
  }

  return { members, replacements, services, total: members.length + replacements.length + services.length };
}

// Points the quotation's lines for a replaced person at the new person. Prices, dates and roles stay as quoted;
// the quotation's status is untouched and nobody is notified.
export async function applyReplacementToQuotation(base44, quotationItems, replacement, newMember) {
  const lines = (quotationItems || []).filter((it) => isTeamItem(it) && it.team_member_id === replacement.fromId);
  for (const it of lines) {
    await base44.entities.QuotationItem.update(it.id, {
      team_member_id: newMember.id, reference_id: newMember.id,
      team_member_name_snapshot: newMember.name || "", name: newMember.name || it.name,
    });
  }
  return lines.length;
}
